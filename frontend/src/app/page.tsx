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
            <span className="text-white font-bold text-xl">AI</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Trader</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-gray-400">
          <a href="#features" className="hover:text-white transition-all hover:scale-105">Features</a>
          <a href="#agents" className="hover:text-white transition-all hover:scale-105">AI Agents</a>
          <a href="#how-it-works" className="hover:text-white transition-all hover:scale-105">How It Works</a>
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
            <span className="text-indigo-300">Powered by DeepSeek AI & Reinforcement Learning</span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight tracking-tight">
            <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Trade Smarter with</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
              AI-Powered Agents
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Three intelligent agents collaborate using Chain-of-Thought reasoning
            to analyze markets, manage risk, and execute profitable trades <span className="text-white font-semibold">24/7</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-5 mb-20">
            <Link
              href="/register"
              className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 font-bold text-lg overflow-hidden shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-all hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Trading Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <a
              href="#demo"
              className="px-10 py-4 rounded-2xl border border-white/10 font-bold text-lg hover:bg-white/5 transition-all flex items-center gap-2 hover:scale-105"
            >
              <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Demo
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { value: "$2.4M+", label: "Trading Volume" },
              { value: "89%", label: "Win Rate" },
              { value: "1.8", label: "Sharpe Ratio" }
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

      {/* AI Agents Section */}
      <section id="agents" className="relative z-10 max-w-7xl mx-auto px-8 py-32">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6">
            Meet Your <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI Trading Team</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Three specialized agents with Chain-of-Thought reasoning work together
            to make intelligent, transparent trading decisions.
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
                Generates trading strategies and decides between DeepSeek analysis
                or RL model predictions. Controls the RL engine for optimization.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">COT Reasoning</span>
                <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium">RL Control</span>
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
                Evaluates every trade for risk. Calculates stop-loss, take-profit,
                and position sizing. Has veto power over risky trades.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">COT Reasoning</span>
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
                Searches on-chain data, tracks whale movements, and analyzes
                social sentiment to provide market intelligence.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">COT Reasoning</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">Search</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-32">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6">
            Everything You Need to <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Win</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: "🧠", title: "DeepSeek AI", desc: "Advanced LLM for market analysis" },
            { icon: "🤖", title: "RL Trading", desc: "PPO/SAC algorithms in Docker" },
            { icon: "📊", title: "Real-time PnL", desc: "Track performance by strategy" },
            { icon: "🔒", title: "Risk Control", desc: "Automatic stop-loss management" },
            { icon: "⚡", title: "Test Mode", desc: "Paper trade without risk" },
            { icon: "🎯", title: "Signal Mode", desc: "Get signals, execute manually" },
            { icon: "🚀", title: "Auto Trading", desc: "Full autonomous execution" },
            { icon: "💹", title: "Multi-Pair", desc: "Trade BTC, ETH, SOL & more" },
          ].map((feature, i) => (
            <div key={i} className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all text-center hover:-translate-y-1">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-8 py-32">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6">
            How It <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Works</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Create Strategy", desc: "Choose methodology and timeframes" },
            { step: "02", title: "Backtest", desc: "AI agents test on historical data" },
            { step: "03", title: "Activate", desc: "Approve and activate for live trading" },
            { step: "04", title: "Profit", desc: "AI executes trades automatically" }
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

      {/* CTA Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-32 text-center">
        <div className="relative p-16 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
          <div className="relative">
            <h2 className="text-5xl font-bold mb-6">
              Ready to Trade Smarter?
            </h2>
            <p className="text-gray-400 mb-10 max-w-xl mx-auto text-lg">
              Join traders using AI-powered strategies.
              Start with paper trading and upgrade when you&apos;re ready.
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

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-bold text-lg">Trader</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 AI Trader. Built with DeepSeek AI & Reinforcement Learning.
          </p>
        </div>
      </footer>
    </div>
  );
}
