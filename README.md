# AI Trader - Institutional-Grade AI For Everyone

![License](https://img.shields.io/badge/license-AGPL_v3-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

> **Democratizing access to institutional trading intelligence.**

AI Trader is a self-hosted, open-source AI trading platform that deploys a "Council of Agents" to analyze crypto markets. It leverages state-of-the-art LLMs (DeepSeek R1, GPT-4o, Claude 3.5 Sonnet) to perform technical analysis, risk assessment, and strategy execution.

## 🚀 Features

-   **Council of Agents Architecture**: Consensus-based trading decisions involving three distinct AI personas:
    -   🧠 **Strategy Consultant**: Market structure analysis (SMC, ICT).
    -   🛡️ **Risk Officer**: Position sizing and veto power over dangerous trades.
    -   ⏱️ **Market Analyst**: Timing and volatility analysis.
-   **Secure Bot Access (API Keys)**: Generate scoped API keys to allow external bots (like Clawbot) to securely interact with your trading engine.
-   **Bring Your Own Keys (BYOK)**: You retain full control. Your API keys (Exchange + LLM) are stored locally/encrypted and never shared.
-   **Multi-Model Support**: Plug in your preferred intelligence: DeepSeek, OpenAI, Anthropic, or Google Gemini.
-   **Hybrid Strategy Engine**: Combines Logic-based rules, reinforcement learning (RL) optimization, and LLM reasoning.
-   **Backtesting & Paper Trading**: Test strategies safely before risking real capital.

## 🛠 Tech Stack

-   **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS 4, Framer Motion.
-   **Backend**: Node.js, Express, TypeScript.
-   **Database**: PostgreSQL, Redis (for queues/caching).
-   **ORM**: Prisma.
-   **Queues**: BullMQ.

## 🤖 Bot Integration

AI Trader provides a secure API for external bots to connect and trade.

1.  Go to **Settings** > **API Keys**.
2.  Generate a new key (e.g., "Clawbot").
3.  Copy the key (it's only shown once).
4.  Use `x-api-key` header in your external bot requests.

## 🏁 Getting Started

### Prerequisites

-   **Node.js**: v20 or higher
-   **Docker**: Required for local database and Redis services.
-   **Git**: Version control.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/321barney/ai-trader_ts.git
    cd ai-trader_ts
    ```

2.  **Start Infrastructure (Postgres + Redis)**
    ```bash
    docker-compose up -d
    ```

3.  **Backend Setup**
    ```bash
    cd backend
    npm install
    cp .env.example .env
    # Edit .env with your DATABASE_URL and Redis config
    npx prisma generate
    npx prisma db push
    npm run dev
    ```

4.  **Frontend Setup**
    ```bash
    cd ../frontend
    npm install
 - [x] Fix backend build errors `npm run build` <!-- id: 4 -->
    - [x] Fix `subscription.middleware.ts` <!-- id: 5 -->
    - [x] Fix `routes/onboarding.ts` <!-- id: 6 -->
    - [x] Fix `routes/trading.ts` <!-- id: 7 -->
    cp .env.example .env.local
    npm run dev
    ```

5.  **Access the Dashboard**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🤝 Contributing

We welcome contributions from the community! Whether it's fixing bugs, improving documentation, or proposing new features, your efforts are appreciated.

Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.


## 💝 Support the Project

If you find AI Trader useful and want to support its development, you can donate BNB to the following address:

**BNB (BEP-20):** `0xd46e707136bf0944b5e2ebbf1364b04f0fc148ec`

Your support helps keep the servers running and the models training!

## 📜 License

This project is licensed under the **GNU Affero General Public License v3 (AGPL v3)**.
See the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**This software is for educational purposes only.**
Trading cryptocurrencies involves substantial risk of loss and is not suitable for every investor. The AI models provided are experimental tools and do not constitute financial advice. The authors and contributors accept no liability for any financial losses incurred.
