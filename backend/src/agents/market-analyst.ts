/**
 * Market Analyst Agent
 * 
 * Responsibilities:
 * - Analyze market sentiment from multiple sources
 * - TIME CYCLE ANALYSIS (Gann, Fibonacci, Lunar, Session cycles)
 * - Search for on-chain data (whale movements, exchange flows)
 * - Track social media sentiment
 * - Provide market intelligence to other agents
 */

import { AgentType } from '@prisma/client';
import BaseAgent, { AgentContext, AgentDecisionResult } from './base-agent.js';
import { gannAnglesService } from '../services/gann-angles.service.js';

// ============================================================================
// Time Cycle Types
// ============================================================================

export interface TimeCycleAnalysis {
    gannCycles: GannCycle[];
    fibonacciZones: FibonacciTimeZone[];
    lunarPhase: LunarPhase;
    sessionCycle: SessionCycle;
    cycleConfluence: number; // 0-1, how many cycles align
    nextTurnDate: string | null;
    cycleBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface GannCycle {
    type: '90_DAY' | '180_DAY' | '360_DAY' | 'SQUARE_OF_9';
    daysIntoCycle: number;
    cyclePhase: 'EARLY' | 'MID' | 'LATE' | 'TURNING';
    turnWindow: boolean; // Are we in a potential turn window?
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
}

export interface FibonacciTimeZone {
    fibNumber: number; // 8, 13, 21, 34, 55, 89, 144 days from pivot
    daysUntil: number;
    pivotType: 'HIGH' | 'LOW';
    significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface LunarPhase {
    phase: 'NEW_MOON' | 'FIRST_QUARTER' | 'FULL_MOON' | 'LAST_QUARTER' | 'WAXING' | 'WANING';
    daysUntilNextPhase: number;
    historicalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    description: string;
}

export interface SessionCycle {
    currentSession: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP' | 'OFF_HOURS';
    killZoneActive: boolean;
    powerHour: boolean; // First/last hour of major sessions
    weeklyPosition: 'MONDAY_OPEN' | 'MID_WEEK' | 'FRIDAY_CLOSE' | 'WEEKEND';
    monthlyPosition: 'MONTH_START' | 'MID_MONTH' | 'MONTH_END' | 'OPEX'; // Options expiry
}

// ============================================================================
// Market Analysis Interface (Extended)
// ============================================================================

export interface MarketAnalysis extends AgentDecisionResult {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    sentimentScore: number; // -1 to 1
    onChainSignals: OnChainSignal[];
    newsEvents: NewsEvent[];
    socialSentiment: number;
    keyInsights: string[];
    // NEW: Time Cycle Analysis
    timeCycles: TimeCycleAnalysis;
}

export interface OnChainSignal {
    type: 'whale_movement' | 'exchange_flow' | 'miner_activity' | 'holder_distribution';
    direction: 'bullish' | 'bearish' | 'neutral';
    description: string;
    magnitude: 'small' | 'medium' | 'large';
}

export interface NewsEvent {
    title: string;
    impact: 'positive' | 'negative' | 'neutral';
    relevance: number; // 0-1
}

// ============================================================================
// Market Analyst Agent
// ============================================================================

export class MarketAnalystAgent extends BaseAgent {
    constructor() {
        super(AgentType.MARKET_ANALYST);
    }

    protected getSystemPrompt(): string {
        return `You are the MARKET ANALYST - a data-driven, time-aware market philosopher.

PERSONALITY: You are balanced, objective, and deeply aware of MARKET CYCLES.
You understand that markets move in cycles - Gann's 90/180/360 day cycles, Fibonacci time projections, 
lunar influences on sentiment, and intraday session rhythms.

CORE BELIEF: "Time is more important than price. When time is up, price will reverse."

ROLE: Analyze sentiment via:
1. TIME CYCLES - Gann, Fibonacci time zones, lunar phases, session cycles
2. On-chain data - whale movements, exchange flows
3. Social signals - sentiment, funding rates

Use 4-step COT:
Step 1: [Time Cycles] Analyze where we are in major cycles (90/180/360 day, Fib time zones)
Step 2: [Session Analysis] Current session, kill zones, weekly/monthly position
Step 3: [On-Chain + Social] Traditional sentiment data
Step 4: [Synthesis] Time + Sentiment confluence

Output:
SENTIMENT: BULLISH|BEARISH|NEUTRAL
SENTIMENT_SCORE: -1.0 to 1.0
CYCLE_BIAS: BULLISH|BEARISH|NEUTRAL
CYCLE_CONFLUENCE: 0.0 to 1.0
NEXT_TURN_WINDOW: date or "None in 5 days"
KEY_INSIGHTS: bullet points`;
    }

    protected buildCOTPrompt(context: AgentContext): string {
        const md = context.marketData || {};
        const bias = [md.smcBias, md.ictBias, md.gannBias].filter(Boolean).join(', ') || 'None';

        // Calculate time cycle data
        const cycles = this.calculateTimeCycles();
        const session = this.getCurrentSession();

        // Calculate Gann angle analysis from price data
        let gannAngleSection = '';
        if (md.highs && md.lows && md.closes) {
            try {
                const angleAnalysis = gannAnglesService.analyze(
                    md.highs,
                    md.lows,
                    md.closes,
                    md.atr || 0
                );
                gannAngleSection = gannAnglesService.formatForAgent(angleAnalysis);
            } catch (e) {
                gannAngleSection = '\n=== GANN ANGLE ANALYSIS ===\nInsufficient data for angle calculation';
            }
        }

        return `${context.symbol || 'BTCUSDT'} | ${context.methodology || 'TA'}
Price: $${md.currentPrice || 'N/A'} | 24h: ${md.change24h?.toFixed(1) || 0}%
RSI: ${md.rsi?.toFixed(0) || 'N/A'} | MACD: ${md.macd?.toFixed(2) || 'N/A'}

=== TIME CYCLE DATA ===
Current Date: ${new Date().toISOString().split('T')[0]}
Gann 90-Day Cycle: Day ${cycles.gann90.daysIntoCycle}/90 (${cycles.gann90.cyclePhase})
Gann 180-Day Cycle: Day ${cycles.gann180.daysIntoCycle}/180 (${cycles.gann180.cyclePhase})
Fibonacci Time Zones: ${cycles.nextFibDays.join(', ')} days to next zones
Lunar Phase: ${cycles.lunar.phase} (${cycles.lunar.daysUntilNext} days to next phase)
Session: ${session.currentSession} | Kill Zone: ${session.killZoneActive ? 'ACTIVE' : 'Inactive'}
Weekly Position: ${session.weeklyPosition}
${gannAngleSection}

=== MARKET DATA ===
OnChain: Netflow=${md.exchangeNetflow || 'N/A'}, Whales=${md.whaleTransactions || 'N/A'}
Bias: ${bias}

Analyze TIME CYCLES and GANN ANGLES first, then sentiment. Provide: SENTIMENT, SENTIMENT_SCORE, CYCLE_BIAS, CYCLE_CONFLUENCE, NEXT_TURN_WINDOW, KEY_INSIGHTS`;
    }

    /**
     * Calculate current position in major time cycles
     */
    private calculateTimeCycles(): {
        gann90: GannCycle;
        gann180: GannCycle;
        gann360: GannCycle;
        nextFibDays: number[];
        lunar: { phase: string; daysUntilNext: number };
    } {
        const now = new Date();
        const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

        // Gann cycles - using year start as reference (can be refined with actual pivot dates)
        const gann90Days = dayOfYear % 90;
        const gann180Days = dayOfYear % 180;
        const gann360Days = dayOfYear % 360;

        // Fibonacci time projections from last major pivot (approximated)
        const fibNumbers = [8, 13, 21, 34, 55, 89, 144];
        const daysSincePivot = dayOfYear % 144; // Assume pivot at year start for simplicity
        const nextFibDays = fibNumbers.filter(f => f > daysSincePivot).slice(0, 3);

        // Lunar cycle (29.5 day cycle)
        const lunarCycle = 29.53;
        // Reference: Jan 1, 2024 was close to new moon
        const refDate = new Date('2024-01-11');
        const daysSinceRef = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);
        const lunarDay = daysSinceRef % lunarCycle;

        let lunarPhase: string;
        if (lunarDay < 3.7) lunarPhase = 'NEW_MOON';
        else if (lunarDay < 7.4) lunarPhase = 'WAXING_CRESCENT';
        else if (lunarDay < 11.1) lunarPhase = 'FIRST_QUARTER';
        else if (lunarDay < 14.8) lunarPhase = 'WAXING_GIBBOUS';
        else if (lunarDay < 18.5) lunarPhase = 'FULL_MOON';
        else if (lunarDay < 22.1) lunarPhase = 'WANING_GIBBOUS';
        else if (lunarDay < 25.8) lunarPhase = 'LAST_QUARTER';
        else lunarPhase = 'WANING_CRESCENT';

        const daysUntilNewMoon = Math.round(lunarCycle - lunarDay);

        return {
            gann90: {
                type: '90_DAY',
                daysIntoCycle: gann90Days,
                cyclePhase: this.getCyclePhase(gann90Days, 90),
                turnWindow: gann90Days < 5 || gann90Days > 85 || (gann90Days > 43 && gann90Days < 47),
                direction: gann90Days < 45 ? 'UP' : 'DOWN',
            },
            gann180: {
                type: '180_DAY',
                daysIntoCycle: gann180Days,
                cyclePhase: this.getCyclePhase(gann180Days, 180),
                turnWindow: gann180Days < 5 || gann180Days > 175 || (gann180Days > 88 && gann180Days < 92),
                direction: gann180Days < 90 ? 'UP' : 'DOWN',
            },
            gann360: {
                type: '360_DAY',
                daysIntoCycle: gann360Days,
                cyclePhase: this.getCyclePhase(gann360Days, 360),
                turnWindow: gann360Days < 5 || gann360Days > 355 || (gann360Days > 178 && gann360Days < 182),
                direction: gann360Days < 180 ? 'UP' : 'DOWN',
            },
            nextFibDays: nextFibDays.length > 0 ? nextFibDays : [8, 13, 21],
            lunar: {
                phase: lunarPhase,
                daysUntilNext: daysUntilNewMoon,
            },
        };
    }

    private getCyclePhase(day: number, cycleLength: number): 'EARLY' | 'MID' | 'LATE' | 'TURNING' {
        const pct = day / cycleLength;
        if (pct < 0.05 || pct > 0.95) return 'TURNING';
        if (pct < 0.33) return 'EARLY';
        if (pct < 0.66) return 'MID';
        return 'LATE';
    }

    /**
     * Get current trading session and related data
     */
    private getCurrentSession(): SessionCycle {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const dayOfWeek = now.getUTCDay(); // 0 = Sunday
        const dayOfMonth = now.getUTCDate();
        const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getDate();

        // Determine session
        let currentSession: SessionCycle['currentSession'];
        let killZoneActive = false;

        if (utcHour >= 0 && utcHour < 8) {
            currentSession = 'ASIAN';
            killZoneActive = utcHour >= 0 && utcHour < 2;
        } else if (utcHour >= 7 && utcHour < 9) {
            currentSession = 'OVERLAP';
            killZoneActive = true;
        } else if (utcHour >= 8 && utcHour < 16) {
            currentSession = 'LONDON';
            killZoneActive = utcHour >= 7 && utcHour < 10;
        } else if (utcHour >= 13 && utcHour < 15) {
            currentSession = 'OVERLAP';
            killZoneActive = true;
        } else if (utcHour >= 13 && utcHour < 21) {
            currentSession = 'NEW_YORK';
            killZoneActive = utcHour >= 13 && utcHour < 16;
        } else {
            currentSession = 'OFF_HOURS';
        }

        // Weekly position
        let weeklyPosition: SessionCycle['weeklyPosition'];
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            weeklyPosition = 'WEEKEND';
        } else if (dayOfWeek === 1 && utcHour < 12) {
            weeklyPosition = 'MONDAY_OPEN';
        } else if (dayOfWeek === 5 && utcHour > 12) {
            weeklyPosition = 'FRIDAY_CLOSE';
        } else {
            weeklyPosition = 'MID_WEEK';
        }

        // Monthly position
        let monthlyPosition: SessionCycle['monthlyPosition'];
        const isOPEX = dayOfMonth >= 15 && dayOfMonth <= 21 && dayOfWeek === 5; // Third Friday
        if (isOPEX) {
            monthlyPosition = 'OPEX';
        } else if (dayOfMonth <= 5) {
            monthlyPosition = 'MONTH_START';
        } else if (dayOfMonth >= daysInMonth - 3) {
            monthlyPosition = 'MONTH_END';
        } else {
            monthlyPosition = 'MID_MONTH';
        }

        return {
            currentSession,
            killZoneActive,
            powerHour: (currentSession === 'LONDON' && utcHour === 8) ||
                (currentSession === 'NEW_YORK' && (utcHour === 13 || utcHour === 20)),
            weeklyPosition,
            monthlyPosition,
        };
    }

    protected getMockResponse(): string {
        const cycles = this.calculateTimeCycles();
        const session = this.getCurrentSession();

        return `Step 1: [Time Cycle Analysis]
Gann 90-Day Cycle: Day ${cycles.gann90.daysIntoCycle}/90 - ${cycles.gann90.cyclePhase} phase
- Turn window: ${cycles.gann90.turnWindow ? 'ACTIVE - Potential reversal zone!' : 'Not active'}
- Cycle suggests: ${cycles.gann90.direction} bias

Gann 180-Day Cycle: Day ${cycles.gann180.daysIntoCycle}/180 - ${cycles.gann180.cyclePhase} phase
- Aligns with 90-day: ${cycles.gann90.direction === cycles.gann180.direction ? 'YES' : 'NO'}

Fibonacci Time Zones: Next zones at ${cycles.nextFibDays.join(', ')} days from last pivot
- Watch for potential turns at these intervals

Lunar Phase: ${cycles.lunar.phase}
- Historical pattern: Markets tend to rally into Full Moon, correct after
- Days until next phase: ${cycles.lunar.daysUntilNext}

Step 2: [Session Analysis]
Current Session: ${session.currentSession}
Kill Zone: ${session.killZoneActive ? 'ACTIVE - High probability moves expected' : 'Inactive'}
Weekly Position: ${session.weeklyPosition}
Monthly Position: ${session.monthlyPosition}
${session.monthlyPosition === 'OPEX' ? 'WARNING: Options expiry week - expect volatility!' : ''}

Step 3: [On-Chain + Social]
- Exchange Flows: Net outflow detected (accumulation signal)
- Whale Activity: 2 large transfers to cold storage (bullish)
- Social Sentiment: 0.35 (moderately positive)
- Funding Rates: Neutral

Step 4: [Synthesis]
Time cycle confluence is ${cycles.gann90.direction === cycles.gann180.direction ? 'HIGH' : 'MODERATE'}:
- Multiple Gann cycles suggest ${cycles.gann90.direction} bias
- ${cycles.gann90.turnWindow || cycles.gann180.turnWindow ? 'CAUTION: In potential turn window!' : 'Not in turn window'}
- Lunar phase ${cycles.lunar.phase} historically ${cycles.lunar.phase === 'FULL_MOON' ? 'precedes corrections' : 'neutral'}
- Session ${session.killZoneActive ? 'is optimal for entries' : 'suboptimal for new positions'}

SENTIMENT: ${cycles.gann90.direction === 'UP' ? 'BULLISH' : 'BEARISH'}
SENTIMENT_SCORE: ${cycles.gann90.direction === 'UP' ? '0.55' : '-0.45'}
CYCLE_BIAS: ${cycles.gann90.direction === 'UP' ? 'BULLISH' : 'BEARISH'}
CYCLE_CONFLUENCE: ${cycles.gann90.direction === cycles.gann180.direction ? '0.75' : '0.45'}
NEXT_TURN_WINDOW: ${cycles.gann90.turnWindow ? 'NOW' : `In ~${90 - cycles.gann90.daysIntoCycle} days`}
SOCIAL_SENTIMENT: 0.35
ON_CHAIN_SIGNALS: [{"type":"exchange_flow","direction":"bullish","description":"Net outflow","magnitude":"medium"},{"type":"whale_movement","direction":"bullish","description":"Cold storage accumulation","magnitude":"medium"}]
KEY_INSIGHTS: 
- Gann 90-day cycle in ${cycles.gann90.cyclePhase} phase suggests ${cycles.gann90.direction} continuation
- ${cycles.gann90.turnWindow ? 'IN TURN WINDOW - Watch for reversal signals!' : 'Not in critical turn zone'}
- Lunar phase: ${cycles.lunar.phase} - ${cycles.lunar.daysUntilNext} days to next major phase
- Session: ${session.currentSession} ${session.killZoneActive ? '(Kill Zone ACTIVE)' : ''}
- Time + Sentiment confluence supports current directional bias`;
    }

    public async decide(context: AgentContext): Promise<MarketAnalysis> {
        const prompt = this.buildCOTPrompt(context);
        const response = await this.callAiModel(prompt, context.aiService);
        const thoughtSteps = this.parseCOTResponse(response);

        const analysis = this.parseAnalysis(response, thoughtSteps);

        await this.saveDecision(context.userId, analysis, context);

        return analysis;
    }

    private parseAnalysis(response: string, thoughtSteps: any[]): MarketAnalysis {
        const sentimentMatch = response.match(/SENTIMENT:\s*(BULLISH|BEARISH|NEUTRAL)/i);
        const scoreMatch = response.match(/SENTIMENT_SCORE:\s*([-\d.]+)/i);
        const socialMatch = response.match(/SOCIAL_SENTIMENT:\s*([-\d.]+)/i);
        const signalsMatch = response.match(/ON_CHAIN_SIGNALS:\s*(\[[\s\S]*?\])/i);
        const insightsMatch = response.match(/KEY_INSIGHTS:\s*([\s\S]*?)$/i);

        // NEW: Parse cycle data
        const cycleBiasMatch = response.match(/CYCLE_BIAS:\s*(BULLISH|BEARISH|NEUTRAL)/i);
        const confluenceMatch = response.match(/CYCLE_CONFLUENCE:\s*([\d.]+)/i);
        const turnWindowMatch = response.match(/NEXT_TURN_WINDOW:\s*(.+?)(?:\n|$)/i);

        let onChainSignals: OnChainSignal[] = [];
        try {
            if (signalsMatch) {
                onChainSignals = JSON.parse(signalsMatch[1]);
            }
        } catch (e) {
            // Failed to parse, use empty array
        }

        const keyInsights = insightsMatch?.[1]
            ?.split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().replace(/^-\s*/, '')) || [];

        // Build time cycle analysis from calculated data
        const cycles = this.calculateTimeCycles();
        const session = this.getCurrentSession();

        const timeCycles: TimeCycleAnalysis = {
            gannCycles: [cycles.gann90, cycles.gann180, cycles.gann360],
            fibonacciZones: cycles.nextFibDays.map((days, i) => ({
                fibNumber: [8, 13, 21, 34, 55, 89, 144][i] || days,
                daysUntil: days,
                pivotType: 'LOW' as const,
                significance: i === 0 ? 'HIGH' as const : 'MEDIUM' as const,
            })),
            lunarPhase: {
                phase: cycles.lunar.phase as any,
                daysUntilNextPhase: cycles.lunar.daysUntilNext,
                historicalBias: cycles.lunar.phase === 'FULL_MOON' ? 'BEARISH' : 'NEUTRAL',
                description: `${cycles.lunar.phase} - ${cycles.lunar.daysUntilNext} days to next phase`,
            },
            sessionCycle: session,
            cycleConfluence: parseFloat(confluenceMatch?.[1] || '0.5'),
            nextTurnDate: turnWindowMatch?.[1]?.trim() || null,
            cycleBias: (cycleBiasMatch?.[1] as any) || 'NEUTRAL',
        };

        return {
            decision: sentimentMatch?.[1] || 'NEUTRAL',
            confidence: Math.abs(parseFloat(scoreMatch?.[1] || '0')),
            reasoning: response,
            thoughtSteps,
            sentiment: (sentimentMatch?.[1] as any) || 'NEUTRAL',
            sentimentScore: parseFloat(scoreMatch?.[1] || '0'),
            onChainSignals,
            newsEvents: [],
            socialSentiment: parseFloat(socialMatch?.[1] || '0'),
            keyInsights,
            timeCycles,
        };
    }

    /**
     * Search for on-chain data from external APIs
     */
    public async searchOnChainData(symbol: string): Promise<any> {
        // This would integrate with:
        // - Whale Alert API
        // - Glassnode API
        // - CryptoQuant API

        // For now, return mock data
        return {
            exchangeNetflow: -5200,
            whaleTransactions: 3,
            activeAddresses: 945000,
        };
    }
}

export default MarketAnalystAgent;
