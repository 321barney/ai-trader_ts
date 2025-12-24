'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Plan {
    name: string;
    price: number | null;
    description: string;
    features: string[];
}

interface PlansResponse {
    plans: {
        FREE: Plan;
        PRO: Plan;
        CUSTOM: Plan;
    };
    support: {
        email: string;
        telegram: string;
    };
}

interface SubscriptionStatus {
    plan: string;
    status: string;
    endsAt: string | null;
    termsAccepted: boolean;
    planDetails: Plan;
}

export default function PricingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [plans, setPlans] = useState<PlansResponse | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // Check for payment success/cancelled from URL params
    useEffect(() => {
        if (searchParams.get('payment') === 'success') {
            setPaymentSuccess(true);
        }
    }, [searchParams]);

    // Fetch plans and subscription status
    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch available plans (public endpoint)
                const plansRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/subscription/plans`);
                const plansData = await plansRes.json();
                if (plansData.success) {
                    setPlans(plansData.data);
                }

                // Fetch current subscription (requires auth)
                const token = localStorage.getItem('accessToken');
                if (token) {
                    const subRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/subscription/status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const subData = await subRes.json();
                    if (subData.success) {
                        setSubscription(subData.data);
                        setTermsAccepted(subData.data.termsAccepted);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch pricing data:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Accept terms
    async function handleAcceptTerms() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login?redirect=/pricing');
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/subscription/accept-terms`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                setTermsAccepted(true);
            }
        } catch (err) {
            setError('Failed to accept terms');
        }
    }

    // Subscribe to a plan
    async function handleSubscribe(plan: 'PRO' | 'CUSTOM') {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login?redirect=/pricing');
            return;
        }

        if (!termsAccepted) {
            setError('Please accept the Terms of Service first');
            return;
        }

        if (plan === 'CUSTOM') {
            window.location.href = 'mailto:support@aster.ai?subject=Custom Plan Inquiry';
            return;
        }

        setProcessingPayment(true);
        setError(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/subscription/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plan })
            });

            const data = await res.json();

            if (data.success && data.data.invoiceUrl) {
                // Redirect to NOWPayments payment page
                window.location.href = data.data.invoiceUrl;
            } else {
                setError(data.error || 'Failed to create payment');
            }
        } catch (err) {
            setError('Payment system error. Please try again.');
        } finally {
            setProcessingPayment(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]" />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold">A</span>
                    </div>
                    <span className="text-xl font-bold">ASTER</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                        Dashboard
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="relative z-10 max-w-6xl mx-auto px-8 py-16">
                {/* Payment Success Banner */}
                {paymentSuccess && (
                    <div className="mb-8 p-4 rounded-xl bg-green-500/20 border border-green-500/50 text-center">
                        <h3 className="text-lg font-bold text-green-400">🎉 Payment Successful!</h3>
                        <p className="text-gray-300">Your subscription is now active. Welcome to ASTER Pro!</p>
                        <Link href="/dashboard" className="inline-block mt-4 px-6 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors">
                            Go to Dashboard
                        </Link>
                    </div>
                )}

                {/* Current Subscription Status */}
                {subscription && subscription.plan !== 'FREE' && (
                    <div className="mb-8 p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold">Current Plan: {subscription.plan}</h3>
                                <p className="text-gray-400">
                                    Status: <span className={subscription.status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}>{subscription.status}</span>
                                    {subscription.endsAt && ` • Renews ${new Date(subscription.endsAt).toLocaleDateString()}`}
                                </p>
                            </div>
                            <Link href="/dashboard" className="px-6 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors">
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-4">
                        Choose Your <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Plan</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Pay with cryptocurrency. No credit card required. Cancel anytime.
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-8 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-center text-red-400">
                        {error}
                    </div>
                )}

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    {/* Free Plan */}
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                        <h3 className="text-2xl font-bold mb-2">Free</h3>
                        <p className="text-gray-400 mb-6">Demo mode to explore</p>
                        <div className="text-4xl font-bold mb-6">$0</div>
                        <ul className="space-y-3 text-gray-400 mb-8">
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Basic dashboard access
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> View agent decisions
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Paper trading mode
                            </li>
                            <li className="flex items-center gap-2 text-gray-600">
                                <span>✗</span> Real trading execution
                            </li>
                            <li className="flex items-center gap-2 text-gray-600">
                                <span>✗</span> Signal generation
                            </li>
                        </ul>
                        {subscription?.plan === 'FREE' ? (
                            <div className="w-full py-3 rounded-xl border border-white/20 text-center text-gray-400">
                                Current Plan
                            </div>
                        ) : (
                            <Link href="/register" className="block w-full py-3 rounded-xl border border-white/20 text-center font-medium hover:bg-white/5 transition-colors">
                                Get Started
                            </Link>
                        )}
                    </div>

                    {/* Pro Plan */}
                    <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-500/20 to-purple-500/10 border-2 border-indigo-500/50 relative">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-medium">
                            Recommended
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Pro (BYOK)</h3>
                        <p className="text-gray-400 mb-6">Bring Your Own LLM Keys</p>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-4xl font-bold">$25</span>
                            <span className="text-gray-400">/month</span>
                        </div>
                        <ul className="space-y-3 text-gray-300 mb-8">
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Full trading capabilities
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> All 3 AI agents active
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Unlimited strategies
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Unlimited signals
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Real-time execution
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Priority support
                            </li>
                            <li className="flex items-start gap-2 pt-2 border-t border-white/10 mt-2">
                                <span className="text-yellow-400 mt-0.5">⚡</span>
                                <span className="text-sm">You provide your own LLM API keys</span>
                            </li>
                        </ul>
                        {subscription?.plan === 'PRO' && subscription?.status === 'ACTIVE' ? (
                            <div className="w-full py-3 rounded-xl bg-green-500/20 text-center text-green-400 font-medium">
                                ✓ Active Subscription
                            </div>
                        ) : (
                            <button
                                onClick={() => handleSubscribe('PRO')}
                                disabled={processingPayment}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-center font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processingPayment ? 'Processing...' : 'Subscribe with Crypto'}
                            </button>
                        )}
                    </div>

                    {/* Custom Plan */}
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                        <h3 className="text-2xl font-bold mb-2">Custom</h3>
                        <p className="text-gray-400 mb-6">We provide LLM keys</p>
                        <div className="text-4xl font-bold mb-6">Contact</div>
                        <ul className="space-y-3 text-gray-400 mb-8">
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Everything in Pro
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Managed LLM API keys
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Dedicated support
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Custom integrations
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-400">✓</span> Volume discounts
                            </li>
                        </ul>
                        <a
                            href="mailto:support@aster.ai?subject=Custom Plan Inquiry"
                            className="block w-full py-3 rounded-xl border border-white/20 text-center font-medium hover:bg-white/5 transition-colors"
                        >
                            Contact Sales
                        </a>
                    </div>
                </div>

                {/* Terms Acceptance */}
                {!termsAccepted && (
                    <div className="mb-16 p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-start gap-4">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={termsAccepted}
                                onChange={(e) => e.target.checked && handleAcceptTerms()}
                                className="mt-1 w-5 h-5 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500"
                            />
                            <label htmlFor="terms" className="text-gray-300">
                                I have read and agree to the{' '}
                                <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 underline">
                                    Terms of Service
                                </Link>
                                , including the{' '}
                                <span className="text-yellow-400 font-medium">no-refund policy after the first trading signal is generated</span>.
                            </label>
                        </div>
                    </div>
                )}

                {/* Payment Info */}
                <div className="text-center mb-16">
                    <p className="text-gray-400 text-sm">
                        💳 Pay with BTC, ETH, USDT, and 300+ cryptocurrencies via NOWPayments
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                        Secure payment processing. Your crypto is converted instantly.
                    </p>
                </div>

                {/* Support */}
                <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-xl font-bold mb-4">Need Help?</h3>
                    <p className="text-gray-400 mb-6">Our support team is available 24/7</p>
                    <div className="flex items-center justify-center gap-8">
                        <a href="mailto:support@aster.ai" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
                            <span>📧</span>
                            support@aster.ai
                        </a>
                        <a href="https://t.me/aster_support" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
                            <span>💬</span>
                            @aster_support
                        </a>
                    </div>
                </div>

                {/* Disclaimers */}
                <div className="mt-16 text-center text-gray-500 text-xs">
                    <p className="mb-2">
                        ⚠️ Trading cryptocurrencies involves substantial risk of loss. ASTER is not a financial advisor.
                    </p>
                    <p>
                        See our <Link href="/terms" className="text-gray-400 hover:text-white underline">Terms of Service</Link> and{' '}
                        <Link href="/privacy" className="text-gray-400 hover:text-white underline">Privacy Policy</Link> for full details.
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 py-8 mt-16">
                <div className="max-w-6xl mx-auto px-8 text-center text-gray-500 text-sm">
                    © 2024 ASTER. Multi-Agent AI Trading Platform.
                </div>
            </footer>
        </div>
    );
}
