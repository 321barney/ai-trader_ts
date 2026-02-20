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
        // For open source version, always return PRO/CUSTOM status
        return {
            plan: 'PRO',
            status: 'ACTIVE',
            endsAt: null,
            termsAccepted: true,
            planDetails: PLANS.PRO
        };
    }

    /**
     * Create a new subscription payment
     */
    async createSubscription(userId: string, plan: 'PRO' | 'CUSTOM') {
        throw new Error('Subscriptions are not handled in this version');
    }

    /**
     * Handle webhook from NOWPayments
     */
    async handleWebhook(payload: WebhookPayload, signature?: string) {
        return { processed: true, status: 'SKIPPED' };
    }

    /**
     * Check if user can request refund (only before first signal)
     */
    async canRequestRefund(userId: string): Promise<{ eligible: boolean; reason?: string }> {
        return { eligible: false, reason: 'Not applicable' };
    }

    async markFirstSignal(userId: string) {
        // No-op
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
            } as any
        });
        return { accepted: true };
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId: string) {
        throw new Error('Subscriptions are not handled in this version');
    }
}

export const subscriptionService = new SubscriptionService();
