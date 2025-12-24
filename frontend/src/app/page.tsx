import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[150px]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:100px_100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">ASTER</span>
            <span className="text-xs text-gray-500 -mt-1">Multi-Agent AI Trading</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-gray-400">
          <a href="#agents" className="hover:text-white transition-all hover:scale-105">Agents</a>
          <a href="#how-it-works" className="hover:text-white transition-all hover:scale-105">How It Works</a>
          <a href="#pricing" className="hover:text-white transition-all hover:scale-105">Pricing</a>
          <a href="#faq" className="hover:text-white transition-all hover:scale-105">FAQ</a>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
            Login
          </Link>
          <Link
            href="/register"
            className="relative group px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-medium text-sm overflow-hidden"
          >
            <span className="relative z-10">Get Started</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-32">
        <div className="text-center">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-sm mb-10 backdrop-blur-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-indigo-300">Multi-Agent Orchestration • Autonomous Strategy Execution</span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight tracking-tight">
            <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Meet</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
              ASTER
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-2xl text-gray-300 mb-4 font-medium">
            Autonomous Strategy Trading & Execution Runtime
          </p>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            A council of <span className="text-white font-semibold">3 AI agents</span> deliberates on every trade decision.
            Strategy Consultant, Risk Officer, and Market Analyst work together with
            <span className="text-white font-semibold"> Chain-of-Thought reasoning</span> — fully transparent, always learning.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-5 mb-20">
            <Link
              href="/register"
              className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 font-bold text-lg overflow-hidden shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-all hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Free Trial
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <a
              href="#pricing"
              className="px-10 py-4 rounded-2xl border border-white/10 font-bold text-lg hover:bg-white/5 transition-all flex items-center gap-2 hover:scale-105"
            >
              View Pricing
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { value: "3", label: "AI Agents" },
              { value: "24/7", label: "Autonomous" },
              { value: "100%", label: "Transparent" }
            ].map((stat, i) => (
              <div key={i} className="text-center group cursor-default">
                <div className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent group-hover:from-purple-400 group-hover:to-pink-400 transition-all">
                  {stat.value}
                </div>
                <div className="text-gray-500 text-sm mt-2 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Problem/Solution Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-24 border-t border-white/5">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">
              Why <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Single AI Models</span> Fail
            </h2>
            <ul className="space-y-4 text-gray-400">
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1">✗</span>
                <span>One model can&apos;t see all perspectives — strategy, risk, and market conditions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1">✗</span>
                <span>No checks and balances — a single hallucination can wipe your account</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1">✗</span>
                <span>Black box decisions — you don&apos;t know WHY it made a trade</span>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-6">
              How <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">ASTER</span> Solves This
            </h2>
            <ul className="space-y-4 text-gray-400">
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span><strong className="text-white">3-Agent Council</strong> — Each agent specializes in one domain</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span><strong className="text-white">Risk Officer Veto</strong> — Extreme risk trades are blocked automatically</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span><strong className="text-white">Chain-of-Thought Visible</strong> — See exactly what each agent is thinking</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* AI Agents Section */}
      <section id="agents" className="relative z-10 max-w-7xl mx-auto px-8 py-32">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6">
            The <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">ASTER Council</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Three specialized AI agents with distinct personalities deliberate on every decision.
            No single agent can act alone — consensus is required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Strategy Consultant */}
          <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-indigo-500/50 transition-all hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🧠</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">Strategy Consultant</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Generates trading strategies based on SMC, ICT, or Gann methodology.
                Controls the RL engine and decides when to retrain models.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium">Pattern Recognition</span>
                <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">RL Control</span>
              </div>
            </div>
          </div>

          {/* Risk Officer */}
          <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-emerald-500/50 transition-all hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">Risk Officer</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Evaluates every trade for risk. Calculates position sizing, stop-loss, and take-profit.
                Has <strong className="text-white">veto power</strong> on extreme risk trades.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">Risk Assessment</span>
                <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">Veto Power</span>
              </div>
            </div>
          </div>

          {/* Market Analyst */}
          <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-cyan-500/50 transition-all hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">Market Analyst</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Specializes in Gann time cycles and market timing.
                Tracks market structure, key levels, and optimal entry timing.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium">Time Cycles</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">Market Structure</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-8 py-32 border-t border-white/5">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6">
            How <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">ASTER</span> Works
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Create Strategy", desc: "Choose your methodology (SMC, ICT, Gann) and trading pairs" },
            { step: "02", title: "Backtest", desc: "AI agents test your strategy on historical data with full reasoning" },
            { step: "03", title: "Council Deliberates", desc: "3 agents vote on every trade — consensus required for execution" },
            { step: "04", title: "Execute & Learn", desc: "Trades execute autonomously, agents learn from outcomes" }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                {item.step}
              </div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-8 py-32 border-t border-white/5">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6">
            Simple, Transparent <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Pricing</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Pay with crypto. No hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
            </ul>
            <Link href="/register" className="block w-full py-3 rounded-xl border border-white/20 text-center font-medium hover:bg-white/5 transition-colors">
              Start Free
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-500/20 to-purple-500/10 border-2 border-indigo-500/50 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-medium">
              Most Popular
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
                <span className="text-sm">You provide your own DeepSeek/OpenAI API keys</span>
              </li>
            </ul>
            <Link href="/register?plan=pro" className="block w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-center font-bold hover:opacity-90 transition-opacity">
              Subscribe with Crypto
            </Link>
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
            <a href="mailto:support@aster.ai" className="block w-full py-3 rounded-xl border border-white/20 text-center font-medium hover:bg-white/5 transition-colors">
              Contact Sales
            </a>
          </div>
        </div>

        <p className="text-center text-gray-500 mt-8 text-sm">
          💳 Pay with BTC, ETH, USDT, and 300+ cryptocurrencies via NOWPayments
        </p>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-8 py-32 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">
            Frequently Asked <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Questions</span>
          </h2>
        </div>

        <div className="space-y-6">
          {[
            {
              q: "What is BYOK (Bring Your Own Key)?",
              a: "BYOK means you use your own API keys from LLM providers like DeepSeek, OpenAI, or Anthropic. This gives you control over your AI costs and ensures your trading data stays private. You only pay us $25/month for the platform."
            },
            {
              q: "What happens if the Risk Officer vetoes a trade?",
              a: "When the Risk Officer identifies extreme risk, the trade is blocked and you're notified with the full reasoning. This prevents catastrophic losses. For high (but not extreme) risk, the council still considers the trade if the reward justifies it."
            },
            {
              q: "Can I see what the AI agents are thinking?",
              a: "Yes! Full transparency is core to ASTER. Every decision includes Chain-of-Thought reasoning from all 3 agents. You can see exactly why a trade was made or rejected."
            },
            {
              q: "What's your refund policy?",
              a: "You can request a refund any time BEFORE your first trading signal is generated. Once the AI agents have analyzed the market and produced a signal for you, no refunds are available. This is clearly stated in our Terms of Service."
            },
            {
              q: "Is ASTER providing financial advice?",
              a: "No. ASTER is a software tool that executes trading strategies you configure. We are not financial advisors. Trading cryptocurrencies involves substantial risk of loss. See our full disclaimer below."
            }
          ].map((faq, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-bold mb-2">{faq.q}</h3>
              <p className="text-gray-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Support Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-16 border-t border-white/5">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">Need Help?</h3>
          <p className="text-gray-400 mb-6">Our support team is here for you</p>
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
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-32 text-center">
        <div className="relative p-16 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
          <div className="relative">
            <h2 className="text-5xl font-bold mb-6">
              Ready to Trade with AI?
            </h2>
            <p className="text-gray-400 mb-10 max-w-xl mx-auto text-lg">
              Start with a free demo. When you&apos;re ready, upgrade to Pro for just $25/month.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-12 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 font-bold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-all hover:scale-105"
            >
              Get Started Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Legal Disclaimers */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-16 border-t border-white/5">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-red-400">⚠️ Important Disclaimers</h3>
        </div>

        <div className="space-y-6 text-gray-500 text-sm">
          <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/20">
            <h4 className="font-bold text-red-400 mb-2">Trading Risk Disclaimer</h4>
            <p>
              Trading cryptocurrencies and perpetual contracts involves substantial risk of loss and is not suitable for every investor.
              The valuation of cryptocurrencies may fluctuate, and you may lose some or all of your invested capital.
              Past performance is not indicative of future results. You should only trade with funds you can afford to lose.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
            <h4 className="font-bold text-yellow-400 mb-2">Not Financial Advice</h4>
            <p>
              ASTER and its operators are NOT registered financial advisors, broker-dealers, or investment advisors.
              The information and signals provided by this platform are for informational purposes only and should NOT be considered as financial advice.
              Always do your own research and consider consulting with a licensed financial professional before making investment decisions.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <h4 className="font-bold text-blue-400 mb-2">AI System Limitations</h4>
            <p>
              ASTER uses artificial intelligence and machine learning models that may produce errors or inaccurate predictions.
              AI systems can experience unexpected behaviors, and no trading system can guarantee profits.
              Users are fully responsible for their trading decisions and should verify all signals before execution.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gray-500/5 border border-gray-500/20">
            <h4 className="font-bold text-gray-400 mb-2">Refund Policy</h4>
            <p>
              Refunds are available ONLY before your first trading signal has been generated.
              Once the AI agents have analyzed the market and produced any signal for your account, the subscription is considered used and no refunds will be issued.
              By subscribing, you acknowledge and agree to this policy.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-bold text-lg">ASTER</span>
            </div>

            <div className="flex items-center gap-6 text-gray-500 text-sm">
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <a href="mailto:support@aster.ai" className="hover:text-white transition-colors">Contact</a>
            </div>

            <p className="text-gray-500 text-sm">
              © 2024 ASTER. Multi-Agent AI Trading Platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
