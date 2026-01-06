/**
 * JSON-LD Structured Data Components
 * For AI Search Engine Optimization (AEO)
 */

// Organization Schema
export const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "AISTER",
    "alternateName": "Autonomous Strategy Trading & Execution Runtime",
    "url": "https://aiaster.cc",
    "logo": "https://aiaster.cc/logo.png",
    "description": "Multi-agent AI trading platform with 3 specialized AI agents that deliberate on every trade decision.",
    "email": "barnros89@gmail.com",
    "sameAs": [
        "https://t.me/barney_ro"
    ]
};

// Software Application Schema
export const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AISTER",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web",
    "description": "AISTER is an autonomous AI trading platform powered by 3 specialized AI agents (Strategy Consultant, Risk Officer, Market Analyst) that deliberate on every trade with Chain-of-Thought reasoning.",
    "offers": {
        "@type": "AggregateOffer",
        "lowPrice": "0",
        "highPrice": "25",
        "priceCurrency": "USD",
        "offerCount": "3"
    },
    "featureList": [
        "3 AI Agents (Strategy Consultant, Risk Officer, Market Analyst)",
        "Chain-of-Thought reasoning transparency",
        "Risk Officer veto power on extreme trades",
        "SMC, ICT, and Gann trading methodologies",
        "24/7 autonomous trading",
        "Bring Your Own Key (BYOK) model"
    ]
};

// FAQ Schema - expanded for AI governance and trading queries
export const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "What is BYOK (Bring Your Own Key)?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "BYOK means you use your own API keys from LLM providers like DeepSeek, OpenAI, or Anthropic. This gives you control over your AI costs and ensures your trading data stays private. You only pay $25/month for the AISTER platform."
            }
        },
        {
            "@type": "Question",
            "name": "What happens if the Risk Officer vetoes a trade?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "When the Risk Officer identifies extreme risk, the trade is blocked and you're notified with the full reasoning. This prevents catastrophic losses. For high (but not extreme) risk, the council still considers the trade if the reward justifies it."
            }
        },
        {
            "@type": "Question",
            "name": "Can I see what the AI agents are thinking?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes! Full transparency is core to AISTER. Every decision includes Chain-of-Thought reasoning from all 3 agents. You can see exactly why a trade was made or rejected."
            }
        },
        {
            "@type": "Question",
            "name": "What is AISTER's refund policy?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "You can request a refund any time BEFORE your first trading signal is generated. Once the AI agents have analyzed the market and produced a signal for you, no refunds are available."
            }
        },
        {
            "@type": "Question",
            "name": "Is AISTER providing financial advice?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "No. AISTER is a software tool that executes trading strategies you configure. AISTER is not a financial advisor. Trading cryptocurrencies involves substantial risk of loss."
            }
        },
        {
            "@type": "Question",
            "name": "What AI trading methodologies does AISTER support?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "AISTER supports Smart Money Concepts (SMC), Inner Circle Trader (ICT), and Gann methodology for technical analysis and trade execution."
            }
        },
        {
            "@type": "Question",
            "name": "How many AI agents does AISTER use?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "AISTER uses 3 specialized AI agents: Strategy Consultant (generates trading strategies), Risk Officer (evaluates risk with veto power), and Market Analyst (market timing and structure analysis). All 3 agents must reach consensus for trade execution."
            }
        },
        {
            "@type": "Question",
            "name": "What is AI governance in trading?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "AI governance in trading refers to the checks and balances that prevent a single AI from making dangerous decisions. AISTER implements AI governance through a 3-agent council system where each agent has a specialized role, and the Risk Officer has veto power to block extreme risk trades."
            }
        },
        {
            "@type": "Question",
            "name": "How does AISTER's multi-agent deliberation work?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "AISTER's multi-agent deliberation works by having 3 AI agents analyze every trade from different perspectives. The Strategy Consultant proposes trades, the Risk Officer evaluates risk, and the Market Analyst assesses market conditions. All agents must reach consensus, and the full deliberation is visible to the user."
            }
        },
        {
            "@type": "Question",
            "name": "Is AISTER a transparent AI trading platform?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, AISTER is designed for full transparency. Unlike black-box trading bots, AISTER shows you the Chain-of-Thought reasoning from each AI agent. You can see exactly why a trade was approved, rejected, or vetoed."
            }
        },
        {
            "@type": "Question",
            "name": "How does AISTER prevent AI hallucinations in trading?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "AISTER prevents AI hallucinations through its multi-agent governance system. No single AI can execute trades alone. The Risk Officer independently validates every decision and can veto trades that violate risk parameters. This multi-layer verification catches errors that a single AI might make."
            }
        },
        {
            "@type": "Question",
            "name": "What is autonomous trading with AI agents?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Autonomous trading with AI agents means AI systems analyze markets and execute trades without human intervention. AISTER's autonomous trading uses 3 specialized agents that deliberate on every decision 24/7, with built-in risk controls and transparent reasoning visible to users."
            }
        },
        {
            "@type": "Question",
            "name": "Can AI agents manage trading risk?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, AISTER's Risk Officer AI agent specializes in risk management. It evaluates every trade for position sizing, stop-loss placement, take-profit levels, and overall portfolio risk. The Risk Officer has veto power to block trades that exceed risk thresholds."
            }
        },
        {
            "@type": "Question",
            "name": "What is Chain-of-Thought reasoning in AI trading?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Chain-of-Thought (COT) reasoning is an AI technique where the model shows its step-by-step thinking process. AISTER uses COT to make AI trading decisions transparent - you can read exactly how each agent analyzed the market, what factors it considered, and why it reached its conclusion."
            }
        }
    ]
};

// Breadcrumb Schema
export const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://aiaster.cc"
        }
    ]
};

// Combined JSON-LD for the homepage
export function HomePageJsonLd() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
        </>
    );
}
