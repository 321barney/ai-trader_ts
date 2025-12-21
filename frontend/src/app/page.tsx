import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">AI</span>
          </div>
          <span className="text-xl font-bold">Trader</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#agents" className="hover:text-white transition-colors">AI Agents</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
            Login
          </Link>
          <Link
            href="/register"
            className="btn-primary text-sm px-4 py-2"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Powered by DeepSeek AI & Reinforcement Learning
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Trade Smarter with
            <br />
            <span className="gradient-text">AI-Powered Agents</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Three intelligent agents work together using Chain-of-Thought reasoning
            to analyze markets, manage risk, and execute profitable trades autonomously.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="btn-primary text-lg px-8 py-4 flex items-center gap-2"
            >
              Start Trading Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#demo"
              className="btn-secondary text-lg px-8 py-4 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Demo
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text">$2.4M+</div>
              <div className="text-gray-500 text-sm mt-1">Trading Volume</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text">89%</div>
              <div className="text-gray-500 text-sm mt-1">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text">1.8</div>
              <div className="text-gray-500 text-sm mt-1">Sharpe Ratio</div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Agents Section */}
      <section id="agents" className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Meet Your <span className="gradient-text">AI Trading Team</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Three specialized agents with Chain-of-Thought reasoning work together
            to make intelligent, transparent trading decisions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Strategy Consultant */}
          <div className="card glass glass-hover">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Strategy Consultant</h3>
            <p className="text-gray-400 text-sm mb-4">
              Generates trading strategies and decides between DeepSeek analysis
              or RL model predictions. Controls the RL engine for optimization.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-success">COT Reasoning</span>
              <span className="badge badge-warning">RL Control</span>
            </div>
          </div>

          {/* Risk Officer */}
          <div className="card glass glass-hover">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Risk Officer</h3>
            <p className="text-gray-400 text-sm mb-4">
              Evaluates every trade for risk. Calculates stop-loss, take-profit,
              and position sizing. Has veto power over risky trades.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-success">COT Reasoning</span>
              <span className="badge badge-danger">Veto Power</span>
            </div>
          </div>

          {/* Market Analyst */}
          <div className="card glass glass-hover">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Market Analyst</h3>
            <p className="text-gray-400 text-sm mb-4">
              Searches on-chain data, tracks whale movements, and analyzes
              social sentiment to provide market intelligence.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-success">COT Reasoning</span>
              <span className="badge badge-success">Search</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Everything You Need to <span className="gradient-text">Win</span>
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
            <div key={i} className="card glass glass-hover text-center">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-24 text-center">
        <div className="card glass p-12 glow">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Trade Smarter?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join thousands of traders using AI-powered strategies.
            Start with paper trading and upgrade when you&apos;re ready.
          </p>
          <Link
            href="/register"
            className="btn-primary text-lg px-12 py-4 inline-flex items-center gap-2"
          >
            Get Started Free
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-bold">Trader</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 AI Trader. Built with DeepSeek AI & Reinforcement Learning.
          </p>
        </div>
      </footer>
    </div>
  );
}
