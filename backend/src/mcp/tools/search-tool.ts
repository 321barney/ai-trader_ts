/**
 * Search Tool
 * 
 * MCP tool for market intelligence and news search.
 * Uses Jina AI for real-time market news retrieval.
 */

import { MCPTool, ToolResult, ToolContext, toolRegistry } from '../tool-registry.js';

// Dynamic import
let jinaService: any = null;

async function getJinaService() {
    if (!jinaService) {
        const module = await import('../../services/jina-search.service.js');
        jinaService = module.jinaSearchService;
    }
    return jinaService;
}

// ============================================
// SEARCH_NEWS Tool
// ============================================

const searchNewsTool: MCPTool = {
    name: 'search_news',
    description: 'Search for market news and financial information. In backtest mode, only returns news published before the current simulation date.',
    category: 'analysis',
    parameters: [
        {
            name: 'query',
            type: 'string',
            description: 'Search query (e.g., "Bitcoin price analysis", "NVDA earnings")',
            required: true,
        },
        {
            name: 'max_results',
            type: 'number',
            description: 'Maximum number of results to return',
            required: false,
            default: 5,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { query, max_results = 5 } = params;

        try {
            const jina = await getJinaService();

            const result = await jina.searchMarketNews(query, {
                maxResults: max_results,
                beforeDate: context.isBacktest ? context.currentDate : undefined,
            });

            return {
                success: true,
                data: {
                    query,
                    totalResults: result.totalResults,
                    news: result.results.map((item: any) => ({
                        title: item.title,
                        source: item.source,
                        publishedAt: item.publishedAt,
                        sentiment: item.sentiment,
                        summary: item.summary,
                        url: item.url,
                    })),
                },
                timestamp: new Date(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Search failed: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// GET_SYMBOL_NEWS Tool
// ============================================

const getSymbolNewsTool: MCPTool = {
    name: 'get_symbol_news',
    description: 'Get recent news specifically for a trading symbol.',
    category: 'analysis',
    parameters: [
        {
            name: 'symbol',
            type: 'string',
            description: 'Trading symbol (e.g., BTCUSDT, AAPL)',
            required: true,
        },
        {
            name: 'days',
            type: 'number',
            description: 'Number of days to look back',
            required: false,
            default: 7,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { symbol, days = 7 } = params;

        try {
            const jina = await getJinaService();

            const news = await jina.getSymbolNews(symbol, {
                days,
                beforeDate: context.isBacktest ? context.currentDate : undefined,
            });

            // Calculate overall sentiment
            const sentiments = news.map((n: any) => n.sentimentScore);
            const avgSentiment = sentiments.length > 0
                ? sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length
                : 0;

            return {
                success: true,
                data: {
                    symbol,
                    newsCount: news.length,
                    overallSentiment: avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral',
                    sentimentScore: avgSentiment,
                    news: news.slice(0, 10).map((item: any) => ({
                        title: item.title,
                        sentiment: item.sentiment,
                        publishedAt: item.publishedAt,
                        summary: item.summary,
                    })),
                },
                timestamp: new Date(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to get symbol news: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// GET_FINANCIAL_REPORTS Tool
// ============================================

const getFinancialReportsTool: MCPTool = {
    name: 'get_financial_reports',
    description: 'Get financial reports (earnings, SEC filings, analyst ratings) for a symbol.',
    category: 'analysis',
    parameters: [
        {
            name: 'symbol',
            type: 'string',
            description: 'Stock symbol (e.g., AAPL, GOOGL)',
            required: true,
        },
        {
            name: 'report_type',
            type: 'string',
            description: 'Type of report to search for',
            required: false,
            default: 'all',
            enum: ['earnings', 'guidance', 'sec_filing', 'analyst', 'all'],
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { symbol, report_type = 'all' } = params;

        try {
            const jina = await getJinaService();

            const reports = await jina.getFinancialReports(symbol, {
                reportType: report_type,
                beforeDate: context.isBacktest ? context.currentDate : undefined,
            });

            return {
                success: true,
                data: {
                    symbol,
                    reportType: report_type,
                    reportsFound: reports.length,
                    reports: reports.slice(0, 10).map((r: any) => ({
                        type: r.reportType,
                        title: r.title,
                        source: r.source,
                        publishedAt: r.publishedAt,
                        summary: r.summary,
                    })),
                },
                timestamp: new Date(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to get financial reports: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// ANALYZE_SENTIMENT Tool
// ============================================

const analyzeSentimentTool: MCPTool = {
    name: 'analyze_sentiment',
    description: 'Analyze the sentiment of a given text (news headline, tweet, etc.).',
    category: 'analysis',
    parameters: [
        {
            name: 'text',
            type: 'string',
            description: 'Text to analyze',
            required: true,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { text } = params;

        try {
            const jina = await getJinaService();
            const result = jina.analyzeSentiment(text);

            return {
                success: true,
                data: {
                    text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
                    sentiment: result.sentiment,
                    score: result.score,
                    interpretation: result.score > 0.3
                        ? 'Strongly bullish'
                        : result.score > 0.1
                            ? 'Slightly bullish'
                            : result.score < -0.3
                                ? 'Strongly bearish'
                                : result.score < -0.1
                                    ? 'Slightly bearish'
                                    : 'Neutral',
                },
                timestamp: new Date(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Sentiment analysis failed: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// Register Tools
// ============================================

export function registerSearchTools(): void {
    toolRegistry.registerTool(searchNewsTool);
    toolRegistry.registerTool(getSymbolNewsTool);
    toolRegistry.registerTool(getFinancialReportsTool);
    toolRegistry.registerTool(analyzeSentimentTool);
}

// Auto-register on import
registerSearchTools();
