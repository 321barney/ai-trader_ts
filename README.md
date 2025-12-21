# AI Trader 🤖📈

An AI-powered cryptocurrency trading platform with multi-agent decision making, self-improving strategies, and AsterDex exchange integration.

## Features

- **Multi-Agent AI System**: Strategy Consultant, Risk Officer, and Market Analyst agents using Chain-of-Thought reasoning
- **Self-Improving Strategies**: Test mode with strategy evolution based on signal performance
- **AsterDex Integration**: Full exchange connectivity for trading
- **Signal Tracking**: Track all signals with AI reasoning, win/loss outcomes
- **Real-time Dashboard**: Beautiful UI with agent thoughts, strategy evolution history

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI**: DeepSeek API with Chain-of-Thought prompting
- **Exchange**: AsterDex API

## Project Structure

```
ai-trader/
├── frontend/          # Next.js frontend
│   └── src/app/       # App router pages
├── backend/           # Express backend
│   ├── src/agents/    # AI agents (Strategy, Risk, Market)
│   ├── src/services/  # Core services
│   ├── src/routes/    # API routes
│   └── prisma/        # Database schema
└── docker-compose.yml # PostgreSQL setup
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or use Docker)
- AsterDex API credentials
- DeepSeek API key

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ai-trader.git
cd ai-trader
```

2. **Start PostgreSQL**
```bash
docker-compose up -d
```

3. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npx prisma generate
npx prisma migrate dev
npm run dev
```

4. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

5. **Open the app**
Navigate to http://localhost:3000

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aitrader"
JWT_SECRET="your-jwt-secret"
DEEPSEEK_API_KEY="your-deepseek-key"
ASTER_API_KEY="optional-default-key"
ASTER_API_SECRET="optional-default-secret"
```

## Trading Modes

| Mode | Description |
|------|-------------|
| **Signal** | AI generates signals, you execute manually |
| **Trade** | AI automatically executes trades |
| **Test** | Paper trading with strategy evolution |

## AI Agents

### Strategy Consultant 🎯
Analyzes market data and generates trading decisions using SMC, ICT, or Gann methodologies.

### Risk Officer 🛡️
Validates trades against risk parameters, calculates position sizing, can veto dangerous trades.

### Market Analyst 📊
Provides sentiment analysis, on-chain data insights, and market context.

## License

MIT
