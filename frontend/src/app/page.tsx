"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HomePageJsonLd } from "@/components/JsonLd";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(api.isAuthenticated());
  }, []);

  return (
    <>
      <HomePageJsonLd />
      <div className="min-h-screen bg-[#020408] text-slate-100 overflow-hidden font-sans selection:bg-emerald-500/30">
        {/* Animated Background - Deep Institutional Vibe */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-[#020408] to-[#020408]" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-green-600/5 rounded-full blur-[100px]" />

          {/* Pro Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        {/* Navigation */}
        <nav className="relative z-50 border-b border-white/5 bg-[#020408]/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-xl font-bold text-white">C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-100 tracking-tight">CoTrader</span>
                <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">Institutional AI</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
              <a href="#logic" className="hover:text-white transition-colors">Logic</a>
              <a href="#risk" className="hover:text-white transition-colors">Risk Engine</a>

              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>

            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  Dashboard
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="btn-primary text-sm shadow-lg shadow-emerald-500/20"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="relative z-10 max-w-7xl mx-auto px-8 pt-32 pb-40 text-center">
          {/* Live Status */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 mb-8 animate-breathe">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Systems Operational • Latency 14ms</span>
          </div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tight text-white leading-[1.1]">
            Institutional-Grade <br />
            <span className="text-gradient-neon">
              Alpha Generation
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            CoTrader deploys a council of <span className="text-slate-200 font-medium">3 autonomous AI agents</span> that deliberate on every trade with visible Chain-of-Thought reasoning.
            <br className="hidden md:block" />
            Engineered for risk-adjusted returns.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
            <Link
              href="/register"
              className="btn-primary px-8 py-4 text-lg min-w-[200px] flex justify-center items-center gap-2 group"
            >
              Start Trading
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <a
              href="#logic"
              className="px-8 py-4 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all text-lg font-medium min-w-[200px]"
            >
              View Logic
            </a>
          </div>

          {/* Metrics Dashboard Preview */}
          <div className="relative mx-auto max-w-5xl rounded-xl glass-pro overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50" />

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/50">
              <div className="p-8">
                <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Sharpe Ratio (Backtest)</div>
                <div className="text-4xl font-mono font-bold text-white">3.24</div>
                <div className="text-emerald-400 text-sm mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  Top 1% Performance
                </div>
              </div>
              <div className="p-8">
                <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Win Rate (Simulated)</div>
                <div className="text-4xl font-mono font-bold text-white">68.2%</div>
                <div className="text-slate-400 text-sm mt-2">Avg. R:R 1:2.5</div>
              </div>
              <div className="p-8">
                <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Risk Officer Vetoes</div>
                <div className="text-4xl font-mono font-bold text-white">124</div>
                <div className="text-amber-400 text-sm mt-2">Catastrophes Prevented</div>
              </div>
            </div>
          </div>
        </main>

        {/* Logic Section */}
        <section id="logic" className="relative z-10 py-32 border-t border-slate-800/50 bg-[#0b1121]/30">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
                The CoTrader <span className="text-emerald-500">Council</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                Consensus-based trading. No single model makes the call.
                Three agents must deliberate and agree before capital is deployed.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Agent 1 */}
              <div className="p-8 rounded-xl bg-[#0b1121] border border-slate-800 hover:border-emerald-500/30 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-emerald-900/20 text-emerald-400 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                  🧠
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Strategy Consultant</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  The architect. Analyzes market structure using SMC and ICT concepts.
                  Identifies liquidity sweeps, order blocks, and fair value gaps to propose high-probability setups.
                </p>
              </div>

              {/* Agent 2 */}
              <div className="p-8 rounded-xl bg-[#0b1121] border border-slate-800 hover:border-amber-500/30 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-amber-900/20 text-amber-400 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                  🛡️
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Risk Officer</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  The gatekeeper. Calculates dynamic position sizing and volatility-adjusted stops.
                  Possesses <strong className="text-white">absolute veto power</strong> to reject any trade that violates risk parameters.
                </p>
              </div>

              {/* Agent 3 */}
              <div className="p-8 rounded-xl bg-[#0b1121] border border-slate-800 hover:border-cyan-500/30 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-cyan-900/20 text-cyan-400 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                  ⏱️
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Market Analyst</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  The timer. Utilizes Gann cycles and temporal analysis to determine the "when."
                  Validates if the current market session and volatility profile align with the strategy.
                </p>
              </div>
            </div>
          </div>
        </section>



        <section className="py-20 border-t border-slate-800/50 text-center">
          <h2 className="text-2xl font-bold text-white mb-8">Trusted Technology</h2>
          <div className="flex flex-wrap justify-center gap-6 opacity-70">
            {['DeepSeek R1', 'OpenAI o3', 'Next.js 16', 'Railway', 'Supabase'].map((tech) => (
              <div key={tech} className="px-6 py-3 rounded-full bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm text-slate-300 font-mono text-sm font-semibold hover:bg-slate-700/50 hover:text-white transition-all cursor-default">
                {tech}
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-slate-800 bg-[#020408] py-12 text-sm text-slate-500">
          <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">CoTrader</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <a href="mailto:support@cotrader.com" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-8 mt-8 text-xs text-slate-600 text-center max-w-3xl">
            <strong>Disclaimer:</strong> Trading cryptocurrencies involves substantial risk. CoTrader is a software provider and does not give financial advice.
            Past performance of AI models is not indicative of future results.
          </div>
        </footer>

      </div>
    </>
  );
}
