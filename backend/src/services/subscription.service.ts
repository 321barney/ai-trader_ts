/**
 * Subscription Service
 * Manages user subscriptions and payment processing
 */

import { prisma } from '../utils/prisma.js';
import { nowPaymentsService, type WebhookPayload } from './nowpayments.service.js';

// Plan pricing
const PLANS = {
    FREE: {
        name: 'Free',
        price: 0,
        description: 'Demo mode with limited features',
        features: [
            'Basic dashboard access',
            'View agent decisions',
            'Paper trading mode',
        ]
    },
    PRO: {
        name: 'Pro (BYOK)',
        price: 25,
        description: 'Bring Your Own Key - Full platform access',
        features: [
            'Full trading capabilities',
            'All AI agents active',
            'Unlimited strategies',
            'Unlimited signals',
            'Real-time execution',
            'Priority support',
            'You provide your own LLM API keys'
        ]
    },
    CUSTOM: {
        name: 'Custom / Enterprise',
        price: null, // Contact for pricing
        description: 'We provide managed LLM keys',
        features: [
            'Everything in Pro',
            'Managed LLM API keys included',
            'Dedicated support',
            'Custom integrations',
            'Volume discounts',
        ]
    }
};

// Support contact
const SUPPORT = {
    email: 'support@aster.ai',
    telegram: '@aster_support'
};

class SubscriptionService {
    /**
     * Get available plans
     */
    getPlans() {
        return {
            plans: PLANS,
            support: SUPPORT
        };
    }

    /**
     * Get user's current subscription status
     */
    async getSubscriptionStatus(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                subscriptionPlan: true,
                subscriptionStatus: true,
                subscriptionEndsAt: true,
                termsAccepted: true,
                termsAcceptedAt: true,
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Check if subscription has expired
        if (user.subscriptionEndsAt && new Date() > user.subscriptionEndsAt) {
            if (user.subscriptionPlan !== 'FREE') {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionPlan: 'FREE',
                        subscriptionStatus: 'EXPIRED'
                    }
                });
                return {
                    plan: 'FREE',
                    status: 'EXPIRED',
                    endsAt: user.subscriptionEndsAt,
                    termsAccepted: user.termsAccepted,
                    planDetails: PLANS.FREE
                };
            }
        }

        return {
            plan: user.subscriptionPlan,
            status: user.subscriptionStatus,
            endsAt: user.subscriptionEndsAt,
            termsAccepted: user.termsAccepted,
            planDetails: PLANS[user.subscriptionPlan as keyof typeof PLANS]
        };
    }

    /**
     * Create a new subscription payment
     */
    async createSubscription(userId: string, plan: 'PRO' | 'CUSTOM') {
        if (!nowPaymentsService.isConfigured()) {
            throw new Error('Payment system not configured');
        }

        // Check if user has accepted terms
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, termsAccepted: true }
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (!user.termsAccepted) {
            throw new Error('You must accept the Terms of Service before subscribing');
        }

        // Get plan price
        const planDetails = PLANS[plan];
        if (!planDetails || planDetails.price === null) {
            throw new Error('Please contact support for custom plan pricing');
        }

        // Generate order ID
        const orderId = `ASTER-${plan}-${userId.slice(0, 8)}-${Date.now()}`;

        // Create NOWPayments invoice
        const invoice = await nowPaymentsService.createInvoice({
            priceAmount: planDetails.price,
            priceCurrency: 'usd',
            orderId,
            orderDescription: `ASTER ${planDetails.name} Subscription - 1 Month`,
            successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?payment=success`,
            cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing?payment=cancelled`
        });

        // Create subscription record
        const subscription = await prisma.subscription.create({
            data: {
                userId,
                plan,
                status: 'PENDING',
                invoiceId: invoice.id,
                invoiceUrl: invoice.invoice_url,
                amount: 0, // Will be updated when payment is made
                currency: 'USD',
                amountUsd: planDetails.price
            }
        });

        return {
            subscriptionId: subscription.id,
            invoiceId: invoice.id,
            invoiceUrl: invoice.invoice_url,
            amount: planDetails.price,
            currency: 'USD',
            plan: planDetails.name
        };
    }

    /**
     * Handle webhook from NOWPayments
     */
    async handleWebhook(payload: WebhookPayload, signature?: string) {
        // Verify signature if provided
        if (signature && !nowPaymentsService.verifyWebhookSignature(JSON.stringify(payload), signature)) {
            throw new Error('Invalid webhook signature');
        }

        const paymentStatus = nowPaymentsService.mapPaymentStatus(payload.payment_status);

        // Find the subscription by order_id
        const orderId = payload.order_id;
        const subscription = await prisma.subscription.findFirst({
            where: {
                OR: [
                    { invoiceId: payload.payment_id.toString() },
                    { paymentId: payload.payment_id.toString() }
                ]
            },
            include: { user: true }
        });

        // If not found by payment/invoice ID, try extracting user from order_id
        let targetSubscription = subscription;
        if (!targetSubscription && orderId) {
            // Order ID format: ASTER-PLAN-USERID-TIMESTAMP
            const parts = orderId.split('-');
            if (parts.length >= 3) {
                const userIdPrefix = parts[2];
                const recentSubscription = await prisma.subscription.findFirst({
                    where: {
                        status: 'PENDING',
                        user: {
                            id: { startsWith: userIdPrefix }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    include: { user: true }
                });
                targetSubscription = recentSubscription;
            }
        }

        if (!targetSubscription) {
            console.warn('[Subscription] Webhook received for unknown subscription:', payload.order_id);
            return { processed: false, reason: 'Subscription not found' };
        }

        // Create payment history record
        await prisma.paymentHistory.upsert({
            where: { paymentId: payload.payment_id.toString() },
            create: {
                userId: targetSubscription.userId,
                paymentId: payload.payment_id.toString(),
                invoiceId: payload.purchase_id,
                orderId: payload.order_id,
                amount: payload.pay_amount,
                actuallyPaid: payload.actually_paid,
                currency: payload.pay_currency,
                amountUsd: payload.price_amount,
                status: paymentStatus,
                payAddress: payload.pay_address,
                metadata: payload as any,
                confirmedAt: paymentStatus === 'FINISHED' ? new Date() : null
            },
            update: {
                actuallyPaid: payload.actually_paid,
                status: paymentStatus,
                metadata: payload as any,
                confirmedAt: paymentStatus === 'FINISHED' ? new Date() : null
            }
        });

        // Update subscription on payment completion
        if (paymentStatus === 'FINISHED' || paymentStatus === 'CONFIRMED') {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

            await prisma.subscription.update({
                where: { id: targetSubscription.id },
                data: {
                    status: 'ACTIVE',
                    paymentId: payload.payment_id.toString(),
                    amount: payload.pay_amount,
                    currency: payload.pay_currency,
                    startDate: new Date(),
                    endDate
                }
            });

            // Update user's subscription status
            await prisma.user.update({
                where: { id: targetSubscription.userId },
                data: {
                    subscriptionPlan: targetSubscription.plan,
                    subscriptionStatus: 'ACTIVE',
                    subscriptionEndsAt: endDate
                }
            });

            console.log(`[Subscription] Activated ${targetSubscription.plan} for user ${targetSubscription.userId}`);
        } else if (paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED') {
            await prisma.subscription.update({
                where: { id: targetSubscription.id },
                data: { status: paymentStatus === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED' }
            });
        }

        return { processed: true, status: paymentStatus };
    }

    /**
     * Check if user can request refund (only before first signal)
     */
    async canRequestRefund(userId: string): Promise<{ eligible: boolean; reason?: string }> {
        const subscription = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!subscription) {
            return { eligible: false, reason: 'No active subscription found' };
        }

        if (subscription.firstSignalAt) {
            return {
                eligible: false,
                reason: 'Refund not available after first trading signal has been generated'
            };
        }

        return { eligible: true };
    }

    /**
     * Mark first signal generated (locks refund eligibility)
     */
    async markFirstSignal(userId: string) {
        await prisma.subscription.updateMany({
            where: {
                userId,
                status: 'ACTIVE',
                firstSignalAt: null
            },
            data: {
                firstSignalAt: new Date()
            }
        });
    }

    /**
     * Accept terms of service
     */
    async acceptTerms(userId: string) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                termsAccepted: true,
                termsAcceptedAt: new Date()
            }
        });
        return { accepted: true };
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId: string) {
        const subscription = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE'
            }
        });

        if (!subscription) {
            throw new Error('No active subscription found');
        }

        // Mark as cancelled but keep active until end date
        await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'CANCELLED' }
        });

        await prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: 'CANCELLED' }
        });

        return {
            cancelled: true,
            activeUntil: subscription.endDate,
            message: 'Your subscription has been cancelled. You will continue to have access until the end of your billing period.'
        };
    }
}

export const subscriptionService = new SubscriptionService();
