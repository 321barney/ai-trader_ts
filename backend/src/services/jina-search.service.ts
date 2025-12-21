/**
 * Jina Search Service
 * 
 * Integrates Jina AI for real-time market intelligence:
 * - Market news retrieval
 * - Financial report search
 * - Sentiment analysis
 * - Anti-look-ahead filtering (for backtesting)
 */

export interface NewsItem {
    id: string;
    title: string;
    source: string;
    publishedAt: Date;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;  // -1 to 1
    summary: string;
    content?: string;
    url: string;
    symbols: string[];  // Related symbols mentioned
    relevance: number;  // 0 to 1
}

export interface SearchResult {
    query: string;
    timestamp: Date;
    results: NewsItem[];
    totalResults: number;
}

export interface FinancialReport {
    symbol: string;
    reportType: 'earnings' | 'guidance' | 'sec_filing' | 'analyst';
    title: string;
    publishedAt: Date;
    source: string;
    summary: string;
    keyMetrics?: {
        eps?: number;
        revenue?: number;
        guidance?: string;
    };
    url: string;
}

export class JinaSearchService {
    private apiKey: string;
    private baseUrl: string = 'https://s.jina.ai';
    private readerUrl: string = 'https://r.jina.ai';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.JINA_API_KEY || '';
    }

    /**
     * Search for market news using Jina AI
     */
    async searchMarketNews(
        query: string,
        options: {
            maxResults?: number;
            beforeDate?: Date;  // For anti-look-ahead in backtesting
            symbols?: string[];
        } = {}
    ): Promise<SearchResult> {
        const { maxResults = 10, beforeDate, symbols } = options;

        try {
            // Build search query
            let searchQuery = query;
            if (symbols && symbols.length > 0) {
                searchQuery += ` ${symbols.join(' OR ')}`;
            }
            searchQuery += ' finance trading crypto stock';

            const response = await fetch(`${this.baseUrl}/${encodeURIComponent(searchQuery)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                    'X-Return-Format': 'markdown',
                },
            });

            if (!response.ok) {
                throw new Error(`Jina search failed: ${response.statusText}`);
            }

            const data = await response.text();

            // Parse results and filter by date if needed
            const newsItems = this.parseSearchResults(data, beforeDate);

            return {
                query,
                timestamp: new Date(),
                results: newsItems.slice(0, maxResults),
                totalResults: newsItems.length,
            };
        } catch (error) {
            console.error('[Jina Search] Error:', error);
            return {
                query,
                timestamp: new Date(),
                results: [],
                totalResults: 0,
            };
        }
    }

    /**
     * Get news specifically for a symbol
     */
    async getSymbolNews(
        symbol: string,
        options: {
            days?: number;
            beforeDate?: Date;
        } = {}
    ): Promise<NewsItem[]> {
        const { days = 7, beforeDate } = options;

        // Map common symbols to searchable names
        const symbolNames: Record<string, string> = {
            'BTCUSDT': 'Bitcoin BTC',
            'ETHUSDT': 'Ethereum ETH',
            'SOLUSDT': 'Solana SOL',
            'AVAXUSDT': 'Avalanche AVAX',
            'ARBUSDT': 'Arbitrum ARB',
            'AAPL': 'Apple AAPL',
            'GOOGL': 'Google Alphabet GOOGL',
            'MSFT': 'Microsoft MSFT',
            'NVDA': 'NVIDIA NVDA',
            'TSLA': 'Tesla TSLA',
        };

        const searchName = symbolNames[symbol] || symbol;
        const query = `${searchName} news trading price analysis`;

        const result = await this.searchMarketNews(query, {
            maxResults: 15,
            beforeDate,
            symbols: [symbol],
        });

        return result.results;
    }

    /**
     * Search for financial reports (earnings, SEC filings)
     */
    async getFinancialReports(
        symbol: string,
        options: {
            reportType?: 'earnings' | 'guidance' | 'sec_filing' | 'analyst' | 'all';
            beforeDate?: Date;
        } = {}
    ): Promise<FinancialReport[]> {
        const { reportType = 'all', beforeDate } = options;

        const reportQueries: Record<string, string> = {
            earnings: `${symbol} earnings report quarterly results`,
            guidance: `${symbol} guidance forecast outlook`,
            sec_filing: `${symbol} SEC filing 10-K 10-Q`,
            analyst: `${symbol} analyst rating upgrade downgrade`,
        };

        const queries = reportType === 'all'
            ? Object.values(reportQueries)
            : [reportQueries[reportType]];

        const reports: FinancialReport[] = [];

        for (const query of queries) {
            try {
                const result = await this.searchMarketNews(query, { beforeDate });

                for (const item of result.results) {
                    reports.push({
                        symbol,
                        reportType: this.determineReportType(item.title, item.summary),
                        title: item.title,
                        publishedAt: item.publishedAt,
                        source: item.source,
                        summary: item.summary,
                        url: item.url,
                    });
                }
            } catch (error) {
                console.error(`[Jina Search] Report search error for ${query}:`, error);
            }
        }

        return reports;
    }

    /**
     * Read and summarize a URL using Jina Reader
     */
    async readUrl(url: string): Promise<{
        title: string;
        content: string;
        summary: string;
    }> {
        try {
            const response = await fetch(`${this.readerUrl}/${url}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Jina reader failed: ${response.statusText}`);
            }

            const markdown = await response.text();

            // Extract title (first # heading)
            const titleMatch = markdown.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1] : 'Untitled';

            // Generate summary (first 500 chars)
            const summary = markdown.slice(0, 500).replace(/[#\*\[\]]/g, '').trim();

            return {
                title,
                content: markdown,
                summary,
            };
        } catch (error) {
            console.error('[Jina Reader] Error:', error);
            return {
                title: 'Error',
                content: '',
                summary: 'Failed to read URL',
            };
        }
    }

    /**
     * Analyze sentiment of text
     */
    analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
        // Simple keyword-based sentiment (in production, use ML model)
        const positiveWords = [
            'bullish', 'surge', 'rally', 'gain', 'profit', 'growth', 'beat', 'exceed',
            'upgrade', 'buy', 'outperform', 'strong', 'record', 'high', 'soar', 'jump',
            'breakout', 'momentum', 'accumulation', 'oversold'
        ];

        const negativeWords = [
            'bearish', 'crash', 'plunge', 'loss', 'decline', 'drop', 'miss', 'fail',
            'downgrade', 'sell', 'underperform', 'weak', 'low', 'fall', 'dump', 'tank',
            'breakdown', 'resistance', 'distribution', 'overbought', 'risk', 'warning'
        ];

        const lowerText = text.toLowerCase();
        let score = 0;
        let matchCount = 0;

        for (const word of positiveWords) {
            if (lowerText.includes(word)) {
                score += 1;
                matchCount++;
            }
        }
        for (const word of negativeWords) {
            if (lowerText.includes(word)) {
                score -= 1;
                matchCount++;
            }
        }

        // Normalize score to -1 to 1
        const normalizedScore = matchCount > 0 ? score / matchCount : 0;

        return {
            sentiment: normalizedScore > 0.1 ? 'positive' : normalizedScore < -0.1 ? 'negative' : 'neutral',
            score: Math.max(-1, Math.min(1, normalizedScore)),
        };
    }

    /**
     * Parse Jina search results into NewsItem format
     */
    private parseSearchResults(rawData: string, beforeDate?: Date): NewsItem[] {
        const items: NewsItem[] = [];

        // Parse markdown format from Jina
        // Format: Title: ... URL: ... Description: ...
        const blocks = rawData.split(/\n\n+/);

        for (const block of blocks) {
            if (!block.trim()) continue;

            try {
                // Extract URL (usually in format [title](url) or just url)
                const urlMatch = block.match(/https?:\/\/[^\s\)]+/);
                const url = urlMatch ? urlMatch[0] : '';

                // Extract title (usually the first line or in markdown link)
                const titleMatch = block.match(/\[([^\]]+)\]/) || block.match(/^(.+?)[\n\r]/);
                const title = titleMatch ? titleMatch[1].trim() : block.slice(0, 100);

                // Rest is summary
                const summary = block.replace(urlMatch?.[0] || '', '').replace(title, '').trim().slice(0, 300);

                // Analyze sentiment
                const { sentiment, score } = this.analyzeSentiment(title + ' ' + summary);

                // Extract source from URL
                const sourceMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
                const source = sourceMatch ? sourceMatch[1] : 'Unknown';

                // Use current time as published date (Jina doesn't always provide dates)
                const publishedAt = new Date();

                // Filter by date if needed (anti-look-ahead)
                if (beforeDate && publishedAt > beforeDate) {
                    continue;
                }

                const newsItem: NewsItem = {
                    id: `jina-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    title,
                    source,
                    publishedAt,
                    sentiment,
                    sentimentScore: score,
                    summary,
                    url,
                    symbols: this.extractSymbols(title + ' ' + summary),
                    relevance: 0.8,
                };

                items.push(newsItem);
            } catch (e) {
                // Skip malformed blocks
            }
        }

        return items;
    }

    /**
     * Extract stock/crypto symbols from text
     */
    private extractSymbols(text: string): string[] {
        const symbols: string[] = [];

        // Common crypto patterns
        const cryptoPattern = /\b(BTC|ETH|SOL|AVAX|ARB|XRP|ADA|DOT|LINK|LTC)\b/gi;
        const cryptoMatches = text.match(cryptoPattern);
        if (cryptoMatches) {
            symbols.push(...cryptoMatches.map(s => s.toUpperCase()));
        }

        // Stock ticker patterns (1-5 uppercase letters)
        const stockPattern = /\$([A-Z]{1,5})\b/g;
        const stockMatches = text.matchAll(stockPattern);
        for (const match of stockMatches) {
            symbols.push(match[1]);
        }

        return [...new Set(symbols)];
    }

    /**
     * Determine report type from title/summary
     */
    private determineReportType(title: string, summary: string): FinancialReport['reportType'] {
        const text = (title + ' ' + summary).toLowerCase();

        if (text.includes('earnings') || text.includes('quarterly results') || text.includes('eps')) {
            return 'earnings';
        }
        if (text.includes('guidance') || text.includes('outlook') || text.includes('forecast')) {
            return 'guidance';
        }
        if (text.includes('sec') || text.includes('10-k') || text.includes('10-q') || text.includes('filing')) {
            return 'sec_filing';
        }
        return 'analyst';
    }
}

export const jinaSearchService = new JinaSearchService();
