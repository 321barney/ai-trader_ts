import Link from "next/link";

export default function PrivacyPolicy() {
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
                <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-gray-400 mb-12">Last updated: December 24, 2024</p>

                <div className="space-y-12 text-gray-300">
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">1. Information We Collect</h2>
                        <p className="mb-4">We collect the following information:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Account Information:</strong> Email, username, and password (hashed)</li>
                            <li><strong>API Keys:</strong> Your exchange and LLM provider API keys (encrypted)</li>
                            <li><strong>Trading Data:</strong> Signals, trades, and positions created through the platform</li>
                            <li><strong>Usage Data:</strong> Platform usage patterns and preferences</li>
                            <li><strong>Payment Data:</strong> Transaction IDs and payment status (processed by NOWPayments)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">2. How We Use Your Information</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>To provide and maintain the ASTER platform</li>
                            <li>To process your trades and generate AI signals</li>
                            <li>To process subscription payments</li>
                            <li>To communicate with you about your account</li>
                            <li>To improve our services</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">3. Data Security</h2>
                        <p className="mb-4">We implement security measures including:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>API keys are encrypted at rest</li>
                            <li>Passwords are hashed using bcrypt</li>
                            <li>HTTPS encryption for all data in transit</li>
                            <li>JWT-based authentication with token refresh</li>
                            <li>Rate limiting to prevent abuse</li>
                        </ul>
                        <p className="mt-4 text-gray-400">
                            However, no method of transmission over the Internet is 100% secure.
                            We cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">4. Third-Party Services</h2>
                        <p className="mb-4">We use the following third-party services:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>NOWPayments:</strong> For processing cryptocurrency payments</li>
                            <li><strong>LLM Providers:</strong> Your API keys are used to access DeepSeek, OpenAI, Anthropic, or Gemini</li>
                            <li><strong>Exchange APIs:</strong> Your exchange credentials are used to execute trades</li>
                        </ul>
                        <p className="mt-4 text-gray-400">
                            These services have their own privacy policies. We are not responsible for their data handling practices.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">5. Data Retention</h2>
                        <p>
                            We retain your data for as long as your account is active. You may request deletion of your account
                            and associated data by contacting support. Some data may be retained for legal or operational purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">6. Your Rights</h2>
                        <p className="mb-4">You have the right to:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Export your data</li>
                            <li>Withdraw consent for data processing</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">7. Contact</h2>
                        <p>
                            For privacy-related inquiries, contact us at:
                        </p>
                        <p className="mt-4">
                            <strong>Email:</strong> <a href="mailto:support@aster.ai" className="text-indigo-400 hover:text-indigo-300">support@aster.ai</a>
                        </p>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 mt-16">
                <div className="max-w-4xl mx-auto px-8 flex items-center justify-between">
                    <p className="text-gray-500 text-sm">© 2024 ASTER</p>
                    <div className="flex items-center gap-4 text-gray-500 text-sm">
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <a href="mailto:support@aster.ai" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
