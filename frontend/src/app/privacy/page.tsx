import Link from "next/link";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Navigation */}
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-11 h-11 flex items-center justify-center">
                        <div className="absolute inset-0 bg-pink-500 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-300 opacity-20 blur-md"></div>
                        <div className="relative w-full h-full bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white">
                                <path d="M12 4L4 20H20L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 14L9 19H15L12 14Z" fill="currentColor" fillOpacity="0.2" stroke="none" />
                                <path d="M8 19L12 11L16 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <span className="text-xl font-bold text-white tracking-wide">AISTER</span>
                        <div className="text-[10px] text-gray-400 font-medium tracking-wider">Multi-Agent AI Trading</div>
                    </div>
                </Link>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                    ← Back to Home
                </Link>
            </nav>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-8 py-16">
                <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-gray-400 mb-12">Last updated: December 26, 2024</p>

                <div className="space-y-12 text-gray-300">
                    {/* Introduction */}
                    <section className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-6">
                        <p className="text-lg">
                            At AISTER, we take your privacy seriously. This Privacy Policy explains how we collect,
                            use, disclose, and safeguard your information when you use our multi-agent AI trading platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">1. Information We Collect</h2>
                        <p className="mb-4">We collect the following categories of information:</p>

                        <h3 className="text-lg font-semibold text-indigo-400 mb-2">1.1 Account Information</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                            <li>Email address and username</li>
                            <li>Password (securely hashed using bcrypt)</li>
                            <li>Account preferences and settings</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-indigo-400 mb-2">1.2 API Credentials</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                            <li>Exchange API keys (encrypted at rest using AES-256)</li>
                            <li>LLM provider API keys (encrypted at rest)</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-indigo-400 mb-2">1.3 Trading & Platform Data</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                            <li>Trading signals, strategies, and backtest results</li>
                            <li>Position and order history</li>
                            <li>AI agent analysis and decision logs</li>
                            <li>Platform usage statistics</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-indigo-400 mb-2">1.4 Payment Information</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Cryptocurrency wallet addresses (for payment purposes)</li>
                            <li>Transaction IDs and payment status</li>
                            <li>Subscription plan and billing history</li>
                        </ul>
                        <p className="mt-2 text-gray-400 text-sm">
                            Note: Payment processing is handled by NOWPayments. We do not store your private keys or full payment details.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">2. How We Use Your Information</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Service Delivery:</strong> To provide and maintain the AISTER trading platform</li>
                            <li><strong>Trade Execution:</strong> To generate AI-powered trading signals and execute trades on your behalf</li>
                            <li><strong>AI Analysis:</strong> To power our multi-agent AI system for market analysis</li>
                            <li><strong>Payment Processing:</strong> To manage subscriptions and process payments</li>
                            <li><strong>Communication:</strong> To send important account notifications and updates</li>
                            <li><strong>Platform Improvement:</strong> To analyze usage patterns and improve our services</li>
                            <li><strong>Security:</strong> To detect and prevent fraudulent or unauthorized activity</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">3. Data Security</h2>
                        <p className="mb-4">We implement comprehensive security measures to protect your data:</p>

                        <div className="grid gap-4">
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h4 className="font-semibold text-green-400 mb-2">🔐 Encryption</h4>
                                <ul className="text-sm space-y-1">
                                    <li>• API keys encrypted using AES-256 at rest</li>
                                    <li>• All data transmitted via TLS/HTTPS</li>
                                    <li>• Passwords hashed using bcrypt with salt</li>
                                </ul>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h4 className="font-semibold text-green-400 mb-2">🛡️ Access Control</h4>
                                <ul className="text-sm space-y-1">
                                    <li>• JWT-based authentication with refresh tokens</li>
                                    <li>• Session timeout after 48 hours of inactivity</li>
                                    <li>• Rate limiting to prevent brute force attacks</li>
                                </ul>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h4 className="font-semibold text-green-400 mb-2">📊 Monitoring</h4>
                                <ul className="text-sm space-y-1">
                                    <li>• Real-time security monitoring via Sentry</li>
                                    <li>• Regular security audits and updates</li>
                                    <li>• Automated threat detection</li>
                                </ul>
                            </div>
                        </div>

                        <p className="mt-4 text-gray-400 text-sm">
                            While we implement industry-standard security measures, no method of transmission over the Internet
                            is 100% secure. We cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">4. Third-Party Services</h2>
                        <p className="mb-4">AISTER integrates with the following third-party services:</p>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 text-white">Service</th>
                                        <th className="text-left py-2 text-white">Purpose</th>
                                        <th className="text-left py-2 text-white">Data Shared</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-400">
                                    <tr className="border-b border-white/5">
                                        <td className="py-2">NOWPayments</td>
                                        <td className="py-2">Crypto payment processing</td>
                                        <td className="py-2">Payment amount, wallet address</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2">DeepSeek / OpenAI / Anthropic</td>
                                        <td className="py-2">AI market analysis</td>
                                        <td className="py-2">Market data prompts (via your API key)</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2">AsterDex / Exchanges</td>
                                        <td className="py-2">Trade execution</td>
                                        <td className="py-2">Trade orders (via your API key)</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2">Railway</td>
                                        <td className="py-2">Cloud hosting</td>
                                        <td className="py-2">Application data (encrypted)</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-2">Sentry</td>
                                        <td className="py-2">Error monitoring</td>
                                        <td className="py-2">Error logs (anonymized)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-4 text-gray-400 text-sm">
                            Each third-party service has its own privacy policy. We recommend reviewing their policies
                            for information on their data handling practices.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">5. Data Retention</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Active Accounts:</strong> Data retained for the duration of your account</li>
                            <li><strong>Trading History:</strong> Retained for 2 years for analysis and compliance</li>
                            <li><strong>Backtest Results:</strong> Automatically cleaned up after 90 days</li>
                            <li><strong>Deleted Accounts:</strong> Data removed within 30 days of deletion request</li>
                            <li><strong>Payment Records:</strong> Retained for 7 years for legal/tax compliance</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">6. Your Rights (GDPR)</h2>
                        <p className="mb-4">Under GDPR and similar regulations, you have the right to:</p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h4 className="font-semibold text-white mb-1">Access</h4>
                                <p className="text-sm text-gray-400">Request a copy of your personal data</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h4 className="font-semibold text-white mb-1">Rectification</h4>
                                <p className="text-sm text-gray-400">Correct inaccurate or incomplete data</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h4 className="font-semibold text-white mb-1">Erasure</h4>
                                <p className="text-sm text-gray-400">Request deletion of your data</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h4 className="font-semibold text-white mb-1">Portability</h4>
                                <p className="text-sm text-gray-400">Export your data in a machine-readable format</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h4 className="font-semibold text-white mb-1">Restriction</h4>
                                <p className="text-sm text-gray-400">Limit how we process your data</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h4 className="font-semibold text-white mb-1">Objection</h4>
                                <p className="text-sm text-gray-400">Object to data processing activities</p>
                            </div>
                        </div>
                        <p className="mt-4 text-gray-400 text-sm">
                            To exercise any of these rights, please contact us at the email below.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">7. Cookies & Tracking</h2>
                        <p className="mb-4">AISTER uses minimal cookies for essential functionality:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Authentication:</strong> Session tokens stored in localStorage</li>
                            <li><strong>Preferences:</strong> Trading mode (paper/live) and UI settings</li>
                        </ul>
                        <p className="mt-4 text-gray-400">
                            We do not use third-party tracking cookies or sell your data to advertisers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">8. Children&apos;s Privacy</h2>
                        <p>
                            AISTER is not intended for users under 18 years of age. We do not knowingly collect
                            personal information from children. If you believe we have collected data from a minor,
                            please contact us immediately.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-white">9. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any material
                            changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                            Your continued use of AISTER after changes constitutes acceptance of the updated policy.
                        </p>
                    </section>

                    <section className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <h2 className="text-2xl font-bold mb-4 text-white">10. Contact Us</h2>
                        <p className="mb-4">
                            For privacy-related inquiries, data requests, or concerns, please contact:
                        </p>
                        <div className="space-y-2">
                            <p>
                                <strong>Email:</strong>{" "}
                                <a href="mailto:barnros89@gmail.com" className="text-indigo-400 hover:text-indigo-300">
                                    barnros89@gmail.com
                                </a>
                            </p>
                            <p>
                                <strong>Website:</strong>{" "}
                                <a href="https://www.aiaster.cc" className="text-indigo-400 hover:text-indigo-300">
                                    www.aiaster.cc
                                </a>
                            </p>
                        </div>
                        <p className="mt-4 text-gray-400 text-sm">
                            We aim to respond to all privacy inquiries within 30 days.
                        </p>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 mt-16">
                <div className="max-w-4xl mx-auto px-8 flex items-center justify-between">
                    <p className="text-gray-500 text-sm">© 2024 AISTER. All rights reserved.</p>
                    <div className="flex items-center gap-4 text-gray-500 text-sm">
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <a href="mailto:barnros89@gmail.com" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
