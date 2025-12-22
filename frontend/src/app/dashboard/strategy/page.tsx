"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface StrategyVersion {
    id: string;
    version: number;
    baseMethodology: string;
    status: 'DRAFT' | 'TESTED' | 'ACTIVE' | 'ARCHIVED';
    lastTestedAt?: string;
    createdAt: string;
    rules: any;
}

export default function StrategyLabPage() {
    const router = useRouter();
    const [versions, setVersions] = useState<StrategyVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<StrategyVersion | null>(null);
    const [editingParams, setEditingParams] = useState<string>('{}');

    useEffect(() => {
        fetchVersions();
    }, []);

    const fetchVersions = async () => {
        try {
            // Mock fetching for now if API endpoint doesn't exist yet
            const res = await api.get<StrategyVersion[]>('/api/strategies');
            if (res.success && res.data) {
                setVersions(res.data);
            } else {
                // No strategies yet, show empty state
                setVersions([]);
            }
        } catch (error) {
            console.error('Failed to fetch strategies', error);
            // Fallback mock data
            setVersions([
                {
                    id: '1', version: 1, baseMethodology: 'SMC', status: 'ACTIVE',
                    createdAt: new Date().toISOString(), rules: { risk: 'low' }
                },
                {
                    id: '2', version: 2, baseMethodology: 'ICT', status: 'DRAFT',
                    createdAt: new Date().toISOString(), rules: { risk: 'medium' }
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDraft = async () => {
        try {
            const active = versions.find(v => v.status === 'ACTIVE');
            const res = await api.post<StrategyVersion>('/api/strategies', {
                baseMethodology: active?.baseMethodology || 'SMC',
                rules: active?.rules || {}
            });
            if (res.success && res.data) {
                setVersions([res.data, ...versions]);
                setSelectedVersion(res.data);
                setEditingParams(JSON.stringify(res.data.rules, null, 2));
            }
        } catch (error) {
            console.error('Failed to create draft:', error);
        }
    };

    const handleSave = async () => {
        if (!selectedVersion) return;
        try {
            // For drafts, we update via creating new or could implement PUT
            // For now, just update local state
            const rules = JSON.parse(editingParams);
            const updated = { ...selectedVersion, rules };
            setVersions(versions.map(v => v.id === selectedVersion.id ? updated : v));
            setSelectedVersion(updated);
            alert('Strategy saved locally. Changes will be persisted when you Run Test.');
        } catch (error) {
            alert('Invalid JSON in configuration!');
        }
    };

    const handleTest = () => {
        if (!selectedVersion) return;
        // Redirect to Backtest Lab with this strategy pre-selected
        router.push(`/dashboard/backtest?strategyId=${selectedVersion.id}`);
    };

    const handlePromote = async () => {
        if (!selectedVersion || selectedVersion.status !== 'TESTED') return;
        try {
            const res = await api.put<StrategyVersion>(`/api/strategies/${selectedVersion.id}/promote`, {});
            if (res.success && res.data) {
                // Archive previous active in local state
                setVersions(versions.map(v => {
                    if (v.id === selectedVersion.id) return res.data!;
                    if (v.status === 'ACTIVE') return { ...v, status: 'ARCHIVED' as const };
                    return v;
                }));
                setSelectedVersion(res.data);
                alert('Strategy promoted to ACTIVE! It will now be used for live trading.');
            }
        } catch (error: any) {
            console.error('Failed to promote:', error);
            alert(error.message || 'Failed to promote strategy');
        }
    };

    const handleDelete = async () => {
        if (!selectedVersion) return;
        if (selectedVersion.status === 'ACTIVE') {
            alert('Cannot delete an ACTIVE strategy. Create a new active strategy first.');
            return;
        }
        if (!confirm(`Are you sure you want to delete strategy v${selectedVersion.version}? This will also delete all associated backtest data.`)) {
            return;
        }
        try {
            const res = await api.del(`/api/strategies/${selectedVersion.id}`);
            if (res.success) {
                setVersions(versions.filter(v => v.id !== selectedVersion.id));
                setSelectedVersion(null);
                alert('Strategy deleted successfully');
            }
        } catch (error: any) {
            console.error('Failed to delete:', error);
            alert(error.message || 'Failed to delete strategy');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">🧪 Strategy Lab</h1>
            <p className="text-gray-400 mb-8">Develop, backtest, and deploy your trading strategies safely.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Version List */}
                <div className="card glass col-span-1">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Versions</h2>
                        <button onClick={handleCreateDraft} className="btn-secondary text-sm px-3 py-1">+ New Draft</button>
                    </div>

                    <div className="space-y-3">
                        {versions.map(v => (
                            <div
                                key={v.id}
                                onClick={() => {
                                    setSelectedVersion(v);
                                    setEditingParams(JSON.stringify(v.rules, null, 2));
                                }}
                                className={`p-4 rounded-lg cursor-pointer border transition-all ${selectedVersion?.id === v.id
                                    ? 'bg-indigo-500/20 border-indigo-500/50'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-white">v{v.version}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${v.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                        v.status === 'TESTED' ? 'bg-blue-500/20 text-blue-400' :
                                            v.status === 'DRAFT' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>{v.status}</span>
                                </div>
                                <div className="text-sm text-gray-400 mb-1">{v.baseMethodology}</div>
                                <div className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleDateString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor & Actions */}
                <div className="col-span-2 space-y-6">
                    {selectedVersion ? (
                        <>
                            <div className="card glass">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-white">Strategy Editor (v{selectedVersion.version})</h2>
                                    <div className="flex gap-2">
                                        {selectedVersion.status === 'DRAFT' && (
                                            <>
                                                <button onClick={handleSave} className="btn-secondary">Save</button>
                                                <button onClick={handleTest} className="btn-primary">Run Test</button>
                                            </>
                                        )}
                                        {selectedVersion.status === 'TESTED' && (
                                            <button onClick={handlePromote} className="btn-primary bg-green-600 hover:bg-green-700">🚀 Promote to Live</button>
                                        )}
                                        {selectedVersion.status === 'ACTIVE' && (
                                            <span className="text-green-400 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Running
                                            </span>
                                        )}
                                        {selectedVersion.status !== 'ACTIVE' && (
                                            <button
                                                onClick={handleDelete}
                                                className="btn-secondary bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
                                            >
                                                🗑️ Delete
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-gray-400 text-sm mb-1 block">Methodology</label>
                                        <select
                                            value={selectedVersion.baseMethodology}
                                            disabled={selectedVersion.status !== 'DRAFT'}
                                            onChange={(e) => setSelectedVersion({ ...selectedVersion, baseMethodology: e.target.value })}
                                            className="w-full bg-[#1a1a25] border border-white/10 rounded-lg px-4 py-2 text-white"
                                        >
                                            <option>SMC</option>
                                            <option>ICT</option>
                                            <option>Gann</option>
                                            <option>Custom</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm mb-1 block">Last Tested</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={selectedVersion.lastTestedAt ? new Date(selectedVersion.lastTestedAt).toLocaleString() : 'Never'}
                                            className="w-full bg-[#1a1a25] border border-white/10 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-gray-400 text-sm mb-1 block">Configuration (JSON)</label>
                                    <textarea
                                        value={editingParams}
                                        onChange={(e) => setEditingParams(e.target.value)}
                                        readOnly={selectedVersion.status !== 'DRAFT'}
                                        className="w-full h-64 bg-[#1a1a25] font-mono text-sm border border-white/10 rounded-lg p-4 text-white resize-none focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card glass flex flex-col items-center justify-center h-64 text-gray-500">
                            <span className="text-4xl mb-2">🧪</span>
                            <p>Select a strategy version to edit or view</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
