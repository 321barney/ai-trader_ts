'use client';

import { useState, useEffect } from 'react';

interface NewsItem {
    title: string;
    source: string;
    publishedAt: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    summary: string;
    url: string;
}

export default function MarketPage() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [symbol, setSymbol] = useState('');
    const [query, setQuery] = useState('crypto market');

    const fetchNews = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = symbol
                ? `http://localhost:3001/api/features/market/news?symbol=${symbol}`
                : `http://localhost:3001/api/features/market/news?query=${query}`;

            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setNews(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch news:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'positive': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'negative': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Market Intelligence</h1>
                    <p className="text-gray-400">Real-time news and sentiment tracking</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search symbol or topic..."
                        className="bg-[#1a1a23] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                        value={symbol || query} // Simplified for demo
                        onChange={(e) => {
                            setSymbol(e.target.value.toUpperCase());
                            setQuery(e.target.value);
                        }}
                    />
                    <button
                        onClick={fetchNews}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        Search
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* News Feed */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Latest News</h2>

                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Loading market intel...</div>
                    ) : (
                        news.map((item, idx) => (
                            <div key={idx} className="bg-[#12121a] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`px-2 py-1 rounded text-xs font-medium border ${getSentimentColor(item.sentiment)}`}>
                                        {item.sentiment.toUpperCase()}
                                    </div>
                                    <span className="text-xs text-gray-500">{new Date(item.publishedAt).toLocaleString()}</span>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400">
                                        {item.title}
                                    </a>
                                </h3>
                                <p className="text-sm text-gray-400 line-clamp-2">{item.summary}</p>
                                <div className="mt-2 text-xs text-gray-500">Source: {item.source}</div>
                            </div>
                        ))
                    )}
                </div>

                {/* Sentiment Gauge & Stats */}
                <div className="space-y-6">
                    <div className="bg-[#12121a] border border-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Market Sentiment</h3>
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="text-4xl font-bold text-green-400 mb-2">Bullish</div>
                            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full w-[75%] rounded-full"></div>
                            </div>
                            <div className="flex justify-between w-full text-xs text-gray-500 mt-2">
                                <span>Bearish</span>
                                <span>Neutral</span>
                                <span>Bullish</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#12121a] border border-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Trending Topics</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Bitcoin', 'Inflation', 'NVIDIA', 'Ethereum', 'AI', 'FedRate'].map(tag => (
                                <span key={tag} className="px-3 py-1 bg-white/5 rounded-full text-sm text-gray-300 hover:bg-white/10 cursor-pointer">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
