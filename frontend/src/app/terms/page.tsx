import Link from "next/link";

export default function TermsOfService() {
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
                {/* Header */}
                <div className="border-b border-white/10 pb-8 mb-12">
                    <p className="text-indigo-400 font-mono text-sm mb-2">LEGAL AGREEMENT</p>
                    <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <span>Effective Date: December 26, 2024</span>
                        <span>•</span>
                        <span>Version 1.0</span>
                    </div>
                </div>

                {/* Important Notice Banner */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-12">
                    <div className="flex items-start gap-4">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h3 className="font-bold text-amber-400 mb-2">IMPORTANT: PLEASE READ CAREFULLY</h3>
                            <p className="text-gray-300 text-sm">
                                This Terms of Service Agreement (&quot;Agreement&quot;) constitutes a legally binding contract between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;)
                                and AISTER (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using the AISTER platform, you acknowledge that you
                                have read, understood, and agree to be bound by all terms and conditions contained herein.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table of Contents */}
                <div className="bg-white/5 rounded-xl p-6 mb-12 border border-white/10">
                    <h3 className="font-bold text-white mb-4">TABLE OF CONTENTS</h3>
                    <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <a href="#section-1" className="text-gray-400 hover:text-indigo-400 transition-colors">1. Definitions</a>
                        <a href="#section-7" className="text-gray-400 hover:text-indigo-400 transition-colors">7. Trading Risk Disclaimer</a>
                        <a href="#section-2" className="text-gray-400 hover:text-indigo-400 transition-colors">2. Acceptance of Terms</a>
                        <a href="#section-8" className="text-gray-400 hover:text-indigo-400 transition-colors">8. Limitation of Liability</a>
                        <a href="#section-3" className="text-gray-400 hover:text-indigo-400 transition-colors">3. Service Description</a>
                        <a href="#section-9" className="text-gray-400 hover:text-indigo-400 transition-colors">9. Indemnification</a>
                        <a href="#section-4" className="text-gray-400 hover:text-indigo-400 transition-colors">4. Subscription & Fees</a>
                        <a href="#section-10" className="text-gray-400 hover:text-indigo-400 transition-colors">10. Third-Party Services</a>
                        <a href="#section-5" className="text-gray-400 hover:text-indigo-400 transition-colors">5. Refund Policy</a>
                        <a href="#section-11" className="text-gray-400 hover:text-indigo-400 transition-colors">11. Intellectual Property</a>
                        <a href="#section-6" className="text-gray-400 hover:text-indigo-400 transition-colors">6. Not Financial Advice</a>
                        <a href="#section-12" className="text-gray-400 hover:text-indigo-400 transition-colors">12. Governing Law</a>
                    </div>
                </div>

                <div className="space-y-12 text-gray-300">
                    {/* Section 1 - Definitions */}
                    <section id="section-1">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 1.</span> DEFINITIONS
                        </h2>
                        <div className="space-y-3 ml-4">
                            <p><strong className="text-white">&quot;Platform&quot;</strong> refers to the AISTER web application, including all features, APIs, and related services provided at aiaster.cc and its subdomains.</p>
                            <p><strong className="text-white">&quot;AI Agents&quot;</strong> refers to the artificial intelligence systems that analyze market data and generate trading signals, including but not limited to the Strategy Agent, Risk Officer, and Market Analyst.</p>
                            <p><strong className="text-white">&quot;Trading Signal&quot;</strong> refers to any analysis, recommendation, or automated action generated by the AI Agents regarding cryptocurrency trading positions.</p>
                            <p><strong className="text-white">&quot;API Keys&quot;</strong> refers to the authentication credentials provided by you for accessing third-party services, including cryptocurrency exchanges and large language model providers.</p>
                            <p><strong className="text-white">&quot;Subscription&quot;</strong> refers to the paid access plan that grants you the right to use the Platform&apos;s features.</p>
                        </div>
                    </section>

                    {/* Section 2 - Acceptance */}
                    <section id="section-2">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 2.</span> ACCEPTANCE OF TERMS
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p>
                                <strong className="text-white">2.1.</strong> By creating an account, accessing, or using the Platform, you represent and warrant that you:
                            </p>
                            <ul className="list-[lower-alpha] list-inside space-y-2 ml-6">
                                <li>Are at least eighteen (18) years of age or the age of majority in your jurisdiction;</li>
                                <li>Have the legal capacity to enter into a binding agreement;</li>
                                <li>Are not prohibited from using the Platform under applicable laws;</li>
                                <li>Will not use the Platform for any unlawful purpose or in violation of any applicable laws or regulations.</li>
                            </ul>
                            <p>
                                <strong className="text-white">2.2.</strong> If you do not agree to all terms of this Agreement, you must immediately cease using the Platform and delete your account.
                            </p>
                        </div>
                    </section>

                    {/* Section 3 - Service Description */}
                    <section id="section-3">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 3.</span> SERVICE DESCRIPTION
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p><strong className="text-white">3.1.</strong> The Platform provides the following services:</p>
                            <ul className="list-[lower-alpha] list-inside space-y-2 ml-6">
                                <li>Multi-agent AI-powered market analysis and trading signal generation;</li>
                                <li>Strategy creation and backtesting capabilities;</li>
                                <li>Automated trade execution through connected exchange APIs;</li>
                                <li>Portfolio monitoring and performance tracking;</li>
                                <li>Risk management tools and position sizing recommendations.</li>
                            </ul>
                            <p><strong className="text-white">3.2.</strong> The Platform utilizes artificial intelligence models that:</p>
                            <ul className="list-[lower-alpha] list-inside space-y-2 ml-6">
                                <li>May produce errors, inaccuracies, or suboptimal predictions;</li>
                                <li>Are not guaranteed to generate profitable trading outcomes;</li>
                                <li>May experience downtime, latency, or technical failures;</li>
                                <li>Are subject to the limitations of available market data.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 4 - Subscription */}
                    <section id="section-4">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 4.</span> SUBSCRIPTION PLANS & FEES
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p><strong className="text-white">4.1. FREE PLAN</strong></p>
                            <p className="ml-6 text-gray-400">Limited access to demonstration features only. Real trading execution is not available. No payment required.</p>

                            <p><strong className="text-white">4.2. PRO PLAN - Twenty-Five United States Dollars ($25.00) per month</strong></p>
                            <ul className="list-[lower-alpha] list-inside space-y-2 ml-6 text-gray-400">
                                <li>Full access to all Platform features and AI Agents;</li>
                                <li>User must provide their own LLM API keys (&quot;Bring Your Own Key&quot; or &quot;BYOK&quot; model);</li>
                                <li>User is responsible for all costs incurred on their API provider accounts;</li>
                                <li>Payment accepted exclusively in cryptocurrency via NOWPayments.</li>
                            </ul>

                            <p><strong className="text-white">4.3. CUSTOM ENTERPRISE PLAN</strong></p>
                            <p className="ml-6 text-gray-400">Custom pricing with managed LLM API keys provided by the Company. Terms negotiated individually. Contact sales for details.</p>

                            <p><strong className="text-white">4.4.</strong> All fees are non-refundable except as expressly provided in Article 5 (Refund Policy) of this Agreement.</p>
                        </div>
                    </section>

                    {/* Section 5 - Refund Policy */}
                    <section id="section-5" className="p-6 rounded-xl bg-red-500/10 border-2 border-red-500/30">
                        <h2 className="text-xl font-bold mb-4 text-red-400 flex items-center gap-2">
                            <span className="font-mono">ARTICLE 5.</span> REFUND POLICY
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p className="font-bold text-white uppercase">
                                THIS SECTION CONTAINS IMPORTANT LIMITATIONS ON REFUNDS. PLEASE READ CAREFULLY.
                            </p>

                            <p><strong className="text-white">5.1. ELIGIBILITY FOR REFUND</strong></p>
                            <p className="ml-6">Refunds are available ONLY if requested before the Platform generates your first Trading Signal. You may request a refund by contacting support within this window.</p>

                            <p><strong className="text-white">5.2. NON-REFUNDABLE CONDITIONS</strong></p>
                            <p className="ml-6">Once the AI Agents have analyzed market data and produced any Trading Signal for your account—whether or not you acted upon such signal—your Subscription is deemed &quot;used&quot; and <strong className="text-red-400">NO REFUNDS SHALL BE ISSUED</strong> under any circumstances.</p>

                            <p><strong className="text-white">5.3. ACKNOWLEDGMENT</strong></p>
                            <p className="ml-6">By subscribing to the Platform, you expressly acknowledge that you have read, understood, and unconditionally agree to this Refund Policy.</p>
                        </div>
                    </section>

                    {/* Section 6 - Not Financial Advice */}
                    <section id="section-6" className="p-6 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/30">
                        <h2 className="text-xl font-bold mb-4 text-yellow-400 flex items-center gap-2">
                            <span className="font-mono">ARTICLE 6.</span> NOT FINANCIAL ADVICE
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p>
                                <strong className="text-white">6.1.</strong> AISTER AND ITS OPERATORS, EMPLOYEES, AGENTS, AND AFFILIATES ARE NOT REGISTERED AS FINANCIAL ADVISORS, BROKER-DEALERS, INVESTMENT ADVISORS, OR ANY OTHER REGULATED FINANCIAL SERVICES PROVIDER IN ANY JURISDICTION.
                            </p>
                            <p><strong className="text-white">6.2.</strong> All information, signals, analysis, and content provided by the Platform are for <strong>INFORMATIONAL AND EDUCATIONAL PURPOSES ONLY</strong> and shall NOT be construed as:</p>
                            <ul className="list-[lower-alpha] list-inside space-y-2 ml-6">
                                <li>Financial advice or investment advice;</li>
                                <li>Personalized trading recommendations;</li>
                                <li>An offer or solicitation to buy, sell, or hold any financial instrument;</li>
                                <li>A guarantee of any particular outcome or return.</li>
                            </ul>
                            <p><strong className="text-white">6.3.</strong> You should conduct your own independent research and consult with a qualified, licensed financial professional before making any investment or trading decisions.</p>
                        </div>
                    </section>

                    {/* Section 7 - Risk Disclaimer */}
                    <section id="section-7" className="p-6 rounded-xl bg-red-500/10 border-2 border-red-500/30">
                        <h2 className="text-xl font-bold mb-4 text-red-400 flex items-center gap-2">
                            <span className="font-mono">ARTICLE 7.</span> TRADING RISK DISCLAIMER
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p className="font-bold text-white uppercase text-lg">
                                ⚠️ TRADING CRYPTOCURRENCIES AND PERPETUAL CONTRACTS INVOLVES SUBSTANTIAL RISK OF LOSS AND IS NOT SUITABLE FOR ALL INVESTORS.
                            </p>
                            <p><strong className="text-white">7.1.</strong> You acknowledge and accept the following risks:</p>
                            <ul className="list-[lower-alpha] list-inside space-y-2 ml-6">
                                <li>You may lose some or ALL of your invested capital;</li>
                                <li>Past performance of the Platform, AI Agents, or any trading strategy is NOT indicative of future results;</li>
                                <li>Cryptocurrency markets are highly volatile, unpredictable, and may experience sudden and extreme price movements;</li>
                                <li>Leveraged trading can significantly amplify both gains AND losses;</li>
                                <li>Technical failures, network issues, or exchange outages may prevent timely execution of trades;</li>
                                <li>Regulatory changes may impact your ability to trade or access your funds.</li>
                            </ul>
                            <p><strong className="text-white">7.2.</strong> You should ONLY trade with capital that you can afford to lose completely without impacting your financial well-being.</p>
                            <p><strong className="text-white">7.3.</strong> By using the Platform, you confirm that you fully understand these risks and accept complete responsibility for all trading decisions and their financial outcomes.</p>
                        </div>
                    </section>

                    {/* Section 8 - Limitation of Liability */}
                    <section id="section-8">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 8.</span> LIMITATION OF LIABILITY
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p className="font-bold text-white uppercase">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
                            <p><strong className="text-white">8.1.</strong> The Company shall NOT be liable for any direct, indirect, incidental, special, consequential, punitive, or exemplary damages arising from:</p>
                            <ul className="list-[lower-alpha] list-inside space-y-2 ml-6">
                                <li>Your use or inability to use the Platform;</li>
                                <li>Any trading losses, regardless of whether caused by AI Agent recommendations, system errors, latency, downtime, or any other factor;</li>
                                <li>Errors, inaccuracies, or omissions in AI-generated analysis or signals;</li>
                                <li>Unauthorized access to or alteration of your data;</li>
                                <li>Third-party conduct or content.</li>
                            </ul>
                            <p><strong className="text-white">8.2. MAXIMUM LIABILITY CAP</strong></p>
                            <p className="ml-6">In no event shall the Company&apos;s total aggregate liability exceed the amount you paid for your Subscription in the twelve (12) months immediately preceding the claim.</p>
                            <p><strong className="text-white">8.3.</strong> Some jurisdictions do not allow the exclusion or limitation of certain damages. In such jurisdictions, our liability shall be limited to the maximum extent permitted by law.</p>
                        </div>
                    </section>

                    {/* Section 9 - Indemnification */}
                    <section id="section-9">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 9.</span> INDEMNIFICATION
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p>You agree to indemnify, defend, and hold harmless the Company, its officers, directors, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or relating to:</p>
                            <ul className="list-[lower-alpha] list-inside space-y-2 ml-6">
                                <li>Your use of the Platform;</li>
                                <li>Your violation of this Agreement;</li>
                                <li>Your violation of any applicable law or regulation;</li>
                                <li>Your infringement of any third-party rights;</li>
                                <li>Any trading decisions you make based on Platform signals or analysis.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 10 - Third Party */}
                    <section id="section-10">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 10.</span> THIRD-PARTY SERVICES
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p><strong className="text-white">10.1.</strong> By providing API Keys to the Platform, you:</p>
                            <ul className="list-[lower-alpha] list-inside space-y-2 ml-6">
                                <li>Authorize the Platform to access your exchange and LLM provider accounts on your behalf;</li>
                                <li>Accept full responsibility for all costs incurred on your third-party accounts;</li>
                                <li>Agree to configure API Keys with appropriate permissions and spending limits;</li>
                                <li>Acknowledge that the Company is not liable for actions taken through your API Keys.</li>
                            </ul>
                            <p><strong className="text-white">10.2.</strong> The Platform integrates with third-party services including but not limited to cryptocurrency exchanges, payment processors (NOWPayments), and AI providers (DeepSeek, OpenAI, Anthropic, Google). Each service has its own terms and privacy policies.</p>
                        </div>
                    </section>

                    {/* Section 11 - IP */}
                    <section id="section-11">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 11.</span> INTELLECTUAL PROPERTY
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p><strong className="text-white">11.1.</strong> All intellectual property rights in the Platform, including but not limited to software, algorithms, AI models, user interface designs, trademarks, and content, are owned by or licensed to the Company.</p>
                            <p><strong className="text-white">11.2.</strong> Your Subscription grants you a limited, non-exclusive, non-transferable, revocable license to use the Platform for personal or internal business purposes only.</p>
                            <p><strong className="text-white">11.3.</strong> You may not copy, modify, distribute, sell, or lease any part of the Platform without prior written consent.</p>
                        </div>
                    </section>

                    {/* Section 12 - Governing Law */}
                    <section id="section-12">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 12.</span> GOVERNING LAW & DISPUTE RESOLUTION
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p><strong className="text-white">12.1.</strong> This Agreement shall be governed by and construed in accordance with applicable international commercial law principles.</p>
                            <p><strong className="text-white">12.2.</strong> Any dispute arising from this Agreement shall first be attempted to be resolved through good-faith negotiation. If unresolved within thirty (30) days, disputes shall be submitted to binding arbitration.</p>
                            <p><strong className="text-white">12.3.</strong> You waive any right to participate in class action lawsuits against the Company.</p>
                        </div>
                    </section>

                    {/* Section 13 - Termination */}
                    <section>
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 13.</span> TERMINATION
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p><strong className="text-white">13.1.</strong> The Company reserves the right to suspend or terminate your account at any time, with or without cause or notice, for any reason including but not limited to violation of this Agreement.</p>
                            <p><strong className="text-white">13.2.</strong> Upon termination, your right to access the Platform immediately ceases. Any fees paid are non-refundable except as provided in Article 5.</p>
                            <p><strong className="text-white">13.3.</strong> You may cancel your Subscription at any time through your account settings. Cancellation takes effect at the end of your current billing period.</p>
                        </div>
                    </section>

                    {/* Section 14 - Amendments */}
                    <section>
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 14.</span> AMENDMENTS
                        </h2>
                        <div className="space-y-4 ml-4">
                            <p>The Company reserves the right to modify this Agreement at any time. Material changes will be notified via email or Platform notification. Your continued use of the Platform after such modifications constitutes acceptance of the updated Agreement.</p>
                        </div>
                    </section>

                    {/* Section 15 - Contact */}
                    <section className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="text-indigo-400 font-mono">ARTICLE 15.</span> CONTACT INFORMATION
                        </h2>
                        <div className="space-y-2 ml-4">
                            <p>For questions regarding this Agreement, please contact:</p>
                            <p className="mt-4">
                                <strong>Email:</strong>{" "}
                                <a href="mailto:barnros89@gmail.com" className="text-indigo-400 hover:text-indigo-300">barnros89@gmail.com</a>
                            </p>
                            <p>
                                <strong>Website:</strong>{" "}
                                <a href="https://www.aiaster.cc" className="text-indigo-400 hover:text-indigo-300">www.aiaster.cc</a>
                            </p>
                        </div>
                    </section>
                </div>

                {/* Signature Section */}
                <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                    <div className="text-center mb-6">
                        <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Electronic Agreement</p>
                        <p className="text-white">
                            By clicking &quot;I Agree&quot; or by accessing the Platform, you acknowledge that you have read, understood,
                            and agree to be legally bound by all terms and conditions of this Agreement.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-bold hover:opacity-90 transition-opacity"
                        >
                            ✓ I Agree — Create Account
                        </Link>
                        <Link
                            href="/"
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            I Do Not Agree
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 mt-16">
                <div className="max-w-4xl mx-auto px-8 flex items-center justify-between">
                    <p className="text-gray-500 text-sm">© 2024 AISTER. All rights reserved.</p>
                    <div className="flex items-center gap-4 text-gray-500 text-sm">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <a href="mailto:barnros89@gmail.com" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
