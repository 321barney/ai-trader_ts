# AISTER - AI Trader 🤖📈

An advanced, autonomous cryptocurrency trading platform powered by multi-agent AI, reinforcement learning, and real-time market analysis. AISTER integrates with the AsterDex exchange to execute trades with institutional-grade risk management.

## 🌟 Core Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Council** | A "brain" consisting of 3 specialized agents (Strategy, Risk, Market) that debate and vote on every trade. |
| **Hybrid Intelligence** | Combines Large Language Models (DeepSeek/GPT-4) for reasoning with Reinforcement Learning (PPO/DQN) for precision. |
| **Strategy Lab** | Create, backtest, and promote strategies from a visual interface. Strategies must pass backtests before activation. |
| **Safety First** | Institutional-grade risk management with 'Circuit Breakers', automated position sizing, and draw-down protection. |
| **Real-Time Execution** | Direct integration with AsterDex for low-latency trade execution and portfolio management. |

---

## 🏗️ Technology Stack

AISTER is built with a modern, high-performance stack designed for reliability and speed.

### Frontend (User Interface)
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4
- **State Management**: React 19 Hooks
- **Features**: Real-time charts, Agent "Thought" visualization, Interactive Backtest Lab.

### Backend (Core Logic)
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Queue System**: BullMQ (Redis-based) for handling concurrent backtests and agent tasks.
- **Security**: Helmet, Rate Limiting, JWT (Access + Refresh tokens).

### AI & Data Science (The Brain)
- **RL Service**: Python 3.10+, FastAPI, PyTorch / Stable-Baselines3.
- **LLM Integration**: DeepSeek V3 (Reasoning), OpenAI (Fallback).
- **Data Pipeline**: Real-time fetching from AsterDex, calculated technical indicators (RSI, MACD, Bollinger Bands).

---

## 🤖 The AI Council

The core of AISTER is its multi-agent system. No single agent makes a decision alone; they function as a council.

### 1. Strategy Consultant ( The "Visionary")
- **Role**: Identifies setups and proposes trades.
- **Methodology**: Uses SMC (Smart Money Concepts), ICT, and Gann Theory.
- **Output**: Proposal (Entry, SL, TP, Reasoning).

### 2. Risk Officer (The "Guardian")
- **Role**: Protects capital above all else.
- **Powers**: **VETO Power** on any trade deemed too risky.
- **Logic**: Calculates Kelly Criterion for sizing, checks portfolio exposure, and enforces max drawdown limits.

### 3. Market Analyst (The "Timekeeper")
- **Role**: Analyzes market alignment and temporal patterns.
- **Focus**: Time cycle analysis, session timing (London/NY), and cyclical turning points.
- **Input**: Provides the "WHEN" to the Council (e.g., "Wait for 10am reversal").

**Orchestrator**: The central system that facilitates the debate between these agents and executes the final consensus.

---

## 🛠️ Systems Overview

### Trading Management System
The lifecycle of a trade in AISTER:
1.  **Signal Generation**: Strategy Consultant analyzes market data and proposes a trade.
2.  **Council Deliberation**: Market Analyst adds context; Risk Officer evaluates safety.
3.  **Vote**: If Consensus is reached and Risk Officer approves, the trade is "Greenlit".
4.  **Execution**: The transaction is signed and sent to AsterDex.
5.  **Monitoring**: Position Manager tracks the trade, adjusting trailing stops or closing regular TP/SL.

### User Management & Security
- **Onboarding Flow**: New users are guided through a setup wizard to configure API keys and risk preferences.
- **Authentication**: Secure JWT-based auth with automatic token refreshing.
- **Data Privacy**: API keys are encrypted at rest.

---

## 🚀 Speed & Performance
- **Backtesting**: Optimized historical replay engine capable of processing months of data in seconds.
- **Latency**: Minimized internal latency for "Tick-to-Trade" efficiency.

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 20+
- Python 3.10+
- PostgreSQL
- Redis (for Queues)

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/321barney/ai-trader.git
   cd ai-trader
   ```

2. **Start Infrastructure**
   ```bash
   docker-compose up -d
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npx prisma db push
   npm run dev
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **AI Service Setup**
   ```bash
   cd rl-service
   pip install -e .
   uvicorn src.main:app --reload
   ```

---

## 📜 License

MIT License. Built for the future of decentralized trading.
