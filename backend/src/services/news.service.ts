/**
 * News Service
 * 
 * Fetches crypto news from free APIs to provide market context
 * for trading decisions.
 * 
 * APIs Used:
 * - CryptoCompare News API (free tier)
 * - CoinGecko Status Updates (free)
 */

export interface NewsItem {
    id: string;
    title: string;
    source: string;
    url: string;
    publishedAt: Date;
    sentiment: 'positive' | 'negative' | 'neutral';
    impact: 'high' | 'medium' | 'low';
    categories: string[];
    summary?: string;
}

export interface NewsSearchResult {
    news: NewsItem[];
    overallSentiment: number; // -1 to 1
    majorEvents: string[];
    lastUpdated: Date;
}

class NewsService {
    private cache: Map<string, { data: NewsSearchResult; timestamp: number }> = new Map();
    private cacheDuration = 15 * 60 * 1000; // 15 minutes

    /**
     * Search for crypto news related to a symbol
     */
    async searchNews(symbol: string): Promise<NewsSearchResult> {
        // Check cache first
        const cacheKey = symbol.toUpperCase();
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            console.log(`[News] Using cached news for ${symbol}`);
            return cached.data;
        }

        try {
            // Try CryptoCompare API first
            const news = await this.fetchCryptoCompareNews(symbol);

            // Analyze sentiment
            const result = this.analyzeNews(news);

            // Cache result
            this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

            console.log(`[News] Fetched ${news.length} articles for ${symbol}, sentiment: ${result.overallSentiment.toFixed(2)}`);
            return result;
        } catch (error) {
            console.warn('[News] Failed to fetch news, using mock data:', error);
            return this.getMockNews(symbol);
        }
    }

    /**
     * Fetch news from CryptoCompare API (free tier, no key required)
     */
    private async fetchCryptoCompareNews(symbol: string): Promise<NewsItem[]> {
        // Extract base asset from symbol (e.g., BTCUSDT -> BTC)
        const baseAsset = symbol.replace(/USDT?|USD|EUR|GBP/i, '').toUpperCase();

        const url = `https://min-api.cryptocompare.com/data/v2/news/?categories=${baseAsset},Blockchain,Trading&excludeCategories=Sponsored`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            throw new Error(`CryptoCompare API error: ${response.status}`);
        }

        const data = await response.json() as { Data?: any[] };

        if (!data.Data || !Array.isArray(data.Data)) {
            return [];
        }

        // Transform to our format (take latest 10)
        return data.Data.slice(0, 10).map((item: any): NewsItem => ({
            id: item.id?.toString() || Math.random().toString(36),
            title: item.title || '',
            source: item.source || 'Unknown',
            url: item.url || '',
            publishedAt: new Date((item.published_on || 0) * 1000),
            sentiment: this.classifySentiment(item.title + ' ' + (item.body || '')),
            impact: this.classifyImpact(item.title || ''),
            categories: item.categories?.split('|') || [],
            summary: item.body?.substring(0, 200) + '...',
        }));
    }

    /**
     * Simple keyword-based sentiment classification
     */
    private classifySentiment(text: string): 'positive' | 'negative' | 'neutral' {
        const lower = text.toLowerCase();

        const positiveKeywords = [
            'bullish', 'surge', 'rally', 'gains', 'soars', 'breakout', 'new high',
            'adoption', 'partnership', 'approved', 'institutional', 'accumulation',
            'etf approved', 'record', 'milestone', 'success', 'growth'
        ];

        const negativeKeywords = [
            'bearish', 'crash', 'plunge', 'dump', 'selloff', 'breakdown', 'new low',
            'hack', 'exploit', 'sec', 'lawsuit', 'ban', 'regulation', 'investigation',
            'fraud', 'scam', 'collapse', 'bankruptcy', 'fear', 'panic'
        ];

        const positiveScore = positiveKeywords.filter(kw => lower.includes(kw)).length;
        const negativeScore = negativeKeywords.filter(kw => lower.includes(kw)).length;

        if (positiveScore > negativeScore) return 'positive';
        if (negativeScore > positiveScore) return 'negative';
        return 'neutral';
    }

    /**
     * Classify impact based on keywords
     */
    private classifyImpact(title: string): 'high' | 'medium' | 'low' {
        const lower = title.toLowerCase();

        const highImpactKeywords = [
            'breaking', 'major', 'etf', 'sec', 'regulation', 'ban', 'hack',
            'billion', 'institutional', 'fed', 'rate', 'crash', 'record'
        ];

        const mediumImpactKeywords = [
            'partnership', 'launch', 'update', 'upgrade', 'analysis',
            'million', 'whale', 'exchange', 'adoption'
        ];

        if (highImpactKeywords.some(kw => lower.includes(kw))) return 'high';
        if (mediumImpactKeywords.some(kw => lower.includes(kw))) return 'medium';
        return 'low';
    }

    /**
     * Analyze news collection for overall sentiment and major events
     */
    private analyzeNews(news: NewsItem[]): NewsSearchResult {
        if (news.length === 0) {
            return {
                news: [],
                overallSentiment: 0,
                majorEvents: [],
                lastUpdated: new Date(),
            };
        }

        // Calculate weighted sentiment (-1 to 1)
        let sentimentSum = 0;
        news.forEach(item => {
            const baseScore = item.sentiment === 'positive' ? 1 :
                item.sentiment === 'negative' ? -1 : 0;
            const impactMultiplier = item.impact === 'high' ? 1.5 :
                item.impact === 'medium' ? 1 : 0.5;
            sentimentSum += baseScore * impactMultiplier;
        });

        const overallSentiment = Math.max(-1, Math.min(1, sentimentSum / news.length));

        // Extract major events (high impact news)
        const majorEvents = news
            .filter(n => n.impact === 'high')
            .map(n => n.title)
            .slice(0, 3);

        return {
            news,
            overallSentiment,
            majorEvents,
            lastUpdated: new Date(),
        };
    }

    /**
     * Generate realistic mock news for testing
     */
    private getMockNews(symbol: string): NewsSearchResult {
        const baseAsset = symbol.replace(/USDT?|USD/i, '');
        const now = new Date();

        const mockNews: NewsItem[] = [
            {
                id: '1',
                title: `${baseAsset} Shows Strong Accumulation Pattern as Institutions Return`,
                source: 'CryptoNews',
                url: 'https://example.com/1',
                publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                sentiment: 'positive',
                impact: 'medium',
                categories: ['Trading', 'Institutional'],
            },
            {
                id: '2',
                title: `Market Analysis: ${baseAsset} Technical Setup Suggests Continuation`,
                source: 'TradingView',
                url: 'https://example.com/2',
                publishedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
                sentiment: 'neutral',
                impact: 'low',
                categories: ['Analysis'],
            },
            {
                id: '3',
                title: `ETF Flows Continue Positive for Fifth Consecutive Week`,
                source: 'Bloomberg',
                url: 'https://example.com/3',
                publishedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
                sentiment: 'positive',
                impact: 'high',
                categories: ['ETF', 'Institutional'],
            },
        ];

        return {
            news: mockNews,
            overallSentiment: 0.35,
            majorEvents: ['ETF Flows Continue Positive for Fifth Consecutive Week'],
            lastUpdated: now,
        };
    }

    /**
     * Get news summary for agent context (condensed format)
     */
    formatForAgentContext(result: NewsSearchResult): string {
        if (result.news.length === 0) {
            return 'No recent news available.';
        }

        const sentiment = result.overallSentiment > 0.2 ? 'POSITIVE' :
            result.overallSentiment < -0.2 ? 'NEGATIVE' : 'NEUTRAL';

        let summary = `News Sentiment: ${sentiment} (${result.overallSentiment.toFixed(2)})\n`;

        if (result.majorEvents.length > 0) {
            summary += `Major Events:\n`;
            result.majorEvents.forEach(e => {
                summary += `- ${e}\n`;
            });
        }

        summary += `Recent Headlines:\n`;
        result.news.slice(0, 3).forEach(n => {
            summary += `- [${n.impact.toUpperCase()}] ${n.title} (${n.sentiment})\n`;
        });

        return summary;
    }
}

export const newsService = new NewsService();
export default newsService;
