import Link from "next/link";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Navigation */}
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold">A</span>
                    </div>
                    <span className="text-xl font-bold">ASTER</span>
                </Link>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                    ← Back to Home
                </Link>
            </nav>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-8 py-16">
                <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
                <p className="text-gray-400 mb-12">Last updated: December 24, 2024</p>

                <div className="space-y-12 text-gray-300">
                    {/* Section 1 */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">1. Acceptance of Terms</h2>
                        <p className="mb-4">
                            By accessing or using ASTER (&quot;the Platform&quot;), you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, you may not use the Platform.
                        </p>
                        <p>
                            ASTER is a software platform that provides AI-powered trading signals and automated trading execution.
                            Use of this platform is at your own risk.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">2. Service Description</h2>
                        <p className="mb-4">
                            ASTER provides:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Multi-agent AI trading analysis and signal generation</li>
                            <li>Backtesting capabilities for trading strategies</li>
                            <li>Automated trade execution (when enabled by user)</li>
                            <li>Dashboard for monitoring positions and performance</li>
                        </ul>
                        <p className="mt-4">
                            The Platform uses artificial intelligence models that may produce errors or inaccurate predictions.
                            No guarantee of profitability is made or implied.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">3. Subscription Plans</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-lg">3.1 Free Plan</h3>
                                <p className="text-gray-400">
                                    Limited access to demo features. No real trading execution.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">3.2 Pro Plan ($25/month)</h3>
                                <p className="text-gray-400">
                                    Full platform access. Users must provide their own LLM API keys (BYOK - Bring Your Own Key).
                                    Payment accepted in cryptocurrency via NOWPayments.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">3.3 Custom Plan</h3>
                                <p className="text-gray-400">
                                    Enterprise pricing with managed LLM API keys provided. Contact sales for pricing.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 4 - REFUND POLICY */}
                    <section className="p-6 rounded-xl bg-red-500/10 border border-red-500/30">
                        <h2 className="text-2xl font-bold mb-4 text-red-400">4. Refund Policy</h2>
                        <p className="mb-4 font-bold text-white">
                            IMPORTANT: Please read this section carefully.
                        </p>
                        <ul className="list-disc list-inside space-y-3 ml-4">
                            <li>
                                <strong>Refunds are available ONLY before your first trading signal is generated.</strong>
                            </li>
                            <li>
                                Once the AI agents have analyzed the market and produced any trading signal for your account,
                                the subscription is considered &quot;used&quot; and <strong>NO refunds will be issued</strong>.
                            </li>
                            <li>
                                By subscribing, you acknowledge that you have read, understood, and agreed to this refund policy.
                            </li>
                            <li>
                                For the Custom plan, refund terms are negotiated individually in your service agreement.
                            </li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">5. User Responsibilities</h2>
                        <p className="mb-4">You are responsible for:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Maintaining the security of your account credentials</li>
                            <li>Providing accurate information during registration</li>
                            <li>Providing your own valid LLM API keys (for Pro plan)</li>
                            <li>Providing your own valid exchange API keys for trading</li>
                            <li>Understanding the risks of cryptocurrency trading</li>
                            <li>Ensuring compliance with your local laws and regulations</li>
                            <li>Making your own independent trading decisions</li>
                        </ul>
                    </section>

                    {/* Section 6 - NOT FINANCIAL ADVICE */}
                    <section className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                        <h2 className="text-2xl font-bold mb-4 text-yellow-400">6. Not Financial Advice</h2>
                        <p className="mb-4">
                            <strong className="text-white">
                                ASTER and its operators are NOT registered financial advisors, broker-dealers, or investment advisors.
                            </strong>
                        </p>
                        <p className="mb-4">
                            All information, signals, and analysis provided by ASTER are for <strong>informational purposes only</strong> and
                            should NOT be considered as:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Financial advice</li>
                            <li>Investment advice</li>
                            <li>Trading recommendations</li>
                            <li>An offer or solicitation to buy or sell any financial instrument</li>
                        </ul>
                        <p className="mt-4">
                            You should always do your own research and consider consulting with a licensed financial professional
                            before making any investment decisions.
                        </p>
                    </section>

                    {/* Section 7 - RISK DISCLAIMER */}
                    <section className="p-6 rounded-xl bg-red-500/10 border border-red-500/30">
                        <h2 className="text-2xl font-bold mb-4 text-red-400">7. Trading Risk Disclaimer</h2>
                        <p className="mb-4 font-bold text-white">
                            Trading cryptocurrencies and perpetual contracts involves SUBSTANTIAL RISK OF LOSS.
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>You may lose some or ALL of your invested capital</li>
                            <li>Past performance is NOT indicative of future results</li>
                            <li>Cryptocurrency markets are highly volatile and unpredictable</li>
                            <li>Leveraged trading can amplify both gains AND losses</li>
                            <li>You should only trade with funds you can afford to lose completely</li>
                        </ul>
                        <p className="mt-4">
                            By using ASTER, you acknowledge that you understand these risks and accept full responsibility
                            for your trading decisions and their outcomes.
                        </p>
                    </section>

                    {/* Section 8 */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">8. Limitation of Liability</h2>
                        <p className="mb-4">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>
                                ASTER shall not be liable for any direct, indirect, incidental, special, consequential,
                                or punitive damages arising from your use of the Platform
                            </li>
                            <li>
                                ASTER shall not be liable for any trading losses, regardless of whether such losses
                                were caused by AI agent recommendations, system errors, or any other factor
                            </li>
                            <li>
                                ASTER shall not be liable for errors, inaccuracies, or omissions in AI-generated analysis
                            </li>
                            <li>
                                Total liability shall be limited to the amount you paid for your subscription in the
                                preceding 12 months
                            </li>
                        </ul>
                    </section>

                    {/* Section 9 */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">9. API Keys and Third-Party Services</h2>
                        <p className="mb-4">
                            By providing API keys to ASTER, you acknowledge:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>You are authorizing the Platform to access your exchange and LLM provider accounts</li>
                            <li>You are responsible for costs incurred on your API provider accounts</li>
                            <li>ASTER stores your API keys securely but cannot guarantee against all security breaches</li>
                            <li>You should use API keys with appropriate permissions and spending limits</li>
                        </ul>
                    </section>

                    {/* Section 10 */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">10. Termination</h2>
                        <p>
                            We reserve the right to terminate or suspend your account at any time, with or without cause,
                            with or without notice. Upon termination, your right to use the Platform will immediately cease.
                            You may cancel your subscription at any time, but refunds are subject to Section 4 of these terms.
                        </p>
                    </section>

                    {/* Section 11 */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">11. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these terms at any time. Changes will be effective immediately
                            upon posting to the Platform. Your continued use of the Platform after changes constitutes
                            acceptance of the modified terms.
                        </p>
                    </section>

                    {/* Section 12 */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">12. Contact</h2>
                        <p>
                            For questions about these Terms of Service, please contact us at:
                        </p>
                        <p className="mt-4">
                            <strong>Email:</strong> <a href="mailto:support@aster.ai" className="text-indigo-400 hover:text-indigo-300">support@aster.ai</a>
                            <br />
                            <strong>Telegram:</strong> <a href="https://t.me/aster_support" className="text-indigo-400 hover:text-indigo-300">@aster_support</a>
                        </p>
                    </section>
                </div>

                {/* Acceptance */}
                <div className="mt-16 p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p className="text-gray-400 mb-4">
                        By using ASTER, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                    </p>
                    <Link
                        href="/register"
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-bold hover:opacity-90 transition-opacity"
                    >
                        I Agree - Create Account
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 mt-16">
                <div className="max-w-4xl mx-auto px-8 flex items-center justify-between">
                    <p className="text-gray-500 text-sm">© 2024 ASTER</p>
                    <div className="flex items-center gap-4 text-gray-500 text-sm">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <a href="mailto:support@aster.ai" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
