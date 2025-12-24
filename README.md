# AISTER - AI Trader 🤖📈

An AI-powered cryptocurrency trading platform with multi-agent decision making, self-improving strategies, and AsterDex exchange integration.

## 🌟 Core Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent AI** | 3 specialized agents using Chain-of-Thought reasoning |
| **Hybrid RL** | Combine LLM with trained RL model |
| **Strategy Lifecycle** | Draft → Test → Approve → Active flow |
| **Signal Tracking** | Monitor predictions with win/loss outcomes |
| **Live Trading** | Auto-execute on AsterDex with risk controls |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 15 • React 19 • TypeScript • TailwindCSS           │
│                                                              │
│  Pages: Dashboard, Strategy Lab, Backtest, Settings         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  Express • TypeScript • Prisma ORM • PostgreSQL             │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Scheduler  │  │   Routes    │  │  Services   │         │
│  │  (5m/1m)    │  │   (REST)    │  │   (Core)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     AI AGENTS                                │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │   Strategy    │ │     Risk      │ │    Market     │     │
│  │  Consultant   │ │   Officer     │ │   Analyst     │     │
│  │   (LLM)       │ │   (Veto)      │ │ (Sentiment)   │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│                           │                                  │
│                     Orchestrator                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Agents

### Strategy Consultant
- Analyzes market with SMC, ICT, or Gann methodology
- Decides LONG / SHORT / HOLD
- Provides entry, stop-loss, take-profit levels

### Risk Officer
- Calculates position sizing (Kelly Criterion)
- **Veto power** on risky trades
- Monitors portfolio exposure and drawdown

### Market Analyst
- Sentiment analysis from on-chain + social
- Whale movement tracking
- News event impact assessment

---

## 📊 Services

| Service | Purpose |
|---------|---------|
| `AsterService` | Exchange API (pairs, OHLCV, orders, balances) |
| `MarketDataService` | Technical indicators (RSI, MACD, EMA, ATR) |
| `TradingService` | Analysis + execution orchestration |
| `StrategyService` | Strategy lifecycle management |
| `SignalTrackerService` | Track signal outcomes |
| `PerformanceService` | Sharpe, drawdown, win rate |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL
- AsterDex API credentials
- LLM API key (DeepSeek, OpenAI, Claude, or Gemini)

### Quick Start
```bash
# Clone
git clone https://github.com/yourusername/ai-trader.git
cd ai-trader

# Database
docker-compose up -d

# Backend
cd backend
npm install
cp .env.example .env
npx prisma generate && npx prisma db push
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

---

## ⚙️ Configuration

### Trading Modes
| Mode | Behavior |
|------|----------|
| **Signal** | Generate signals only, no execution |
| **Trade** | Auto-execute trades (requires tested strategy) |

### Agent Decision Modes
| Mode | Behavior |
|------|----------|
| **AI Agents** | LLM-based analysis |
| **RL Only** | Trained model predictions |
| **Hybrid** | AI + RL combined (consensus boost) |

---

## 🔒 Safety Controls

1. **Strategy Must Be Tested** - Can't go live without backtest
2. **User Approval Required** - Must approve after backtest
3. **Drawdown Protection** - Trading stops if max drawdown exceeded
4. **Position Sizing** - Uses configurable % of capital

---

## 📈 Performance Metrics

- **Sharpe Ratio**: Risk-adjusted returns
- **Sortino Ratio**: Downside risk only
- **Max Drawdown**: Peak-to-trough loss
- **Win Rate**: Percentage of winning trades
- **Profit Factor**: Gross profit / gross loss

---

## 🐳 Deployment (Railway)

Both services have Docker builds:
- Backend: `npm run build` in Dockerfile
- Frontend: Multi-stage build with standalone output

```toml
# railway.toml
[[services]]
name = "backend"
root = "backend"
dockerfilePath = "Dockerfile"

[[services]]
name = "frontend"
root = "frontend"
dockerfilePath = "Dockerfile"
```

---

## 📜 License

MIT
