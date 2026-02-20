import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    permissions: string[];
}

export default function ApiKeysSettings() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        try {
            const data: any = await api.get('/api/api-keys');
            if (data.success) {
                setKeys(data.data);
            }
        } catch (error) {
            console.error('Failed to load API keys:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;
        setCreating(true);
        try {
            const data: any = await api.post('/api/api-keys', { name: newKeyName });
            if (data.success) {
                setGeneratedKey(data.data.apiKey);
                setNewKeyName('');
                loadKeys();
            }
        } catch (error) {
            console.error('Failed to create key:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this API Key? Any bot using it will lose access immediately.')) return;
        try {
            const data: any = await api.del(`/api/api-keys/${id}`);
            if (data.success) {
                setKeys(keys.filter(k => k.id !== id));
            }
        } catch (error) {
            console.error('Failed to revoke key:', error);
        }
    };

    return (
        <div className="card glass">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span>🤖</span> Bot Access Tokens
            </h2>

            <p className="text-gray-400 text-sm mb-4">
                Generate API keys to allow external bots (like Clawbot) to access your account programmatically.
            </p>

            {/* List Keys */}
            <div className="space-y-3 mb-6">
                {loading ? (
                    <div className="text-center py-4 text-gray-500">Loading keys...</div>
                ) : keys.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 bg-white/5 rounded-lg border border-white/5">
                        No API keys generated yet.
                    </div>
                ) : (
                    keys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                            <div>
                                <div className="text-white font-medium flex items-center gap-2">
                                    {key.name}
                                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                        {key.keyPrefix}...
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Created: {new Date(key.createdAt).toLocaleDateString()} •
                                    Last Used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRevokeKey(key.id)}
                                className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded hover:bg-red-500/10 transition-colors"
                            >
                                Revoke
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Create New Key */}
            <div className="border-t border-white/10 pt-4">
                {!generatedKey ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="Bot Name (e.g. Clawbot)"
                            className="flex-1 px-4 py-2 bg-[#1a1a25] border border-white/10 rounded-lg text-white"
                        />
                        <button
                            onClick={handleCreateKey}
                            disabled={creating || !newKeyName.trim()}
                            className="btn-primary px-4 py-2 disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Generate Key'}
                        </button>
                    </div>
                ) : (
                    <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <div className="text-green-400 font-bold mb-2">API Key Generated!</div>
                        <div className="text-sm text-gray-300 mb-2">
                            Copy this key now. You won't be able to see it again.
                        </div>
                        <div className="flex gap-2 items-center bg-black/30 p-2 rounded border border-white/10">
                            <code className="text-emerald-300 font-mono text-sm flex-1 break-all">
                                {generatedKey}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedKey);
                                    alert('Copied to clipboard!');
                                }}
                                className="text-gray-400 hover:text-white px-2"
                            >
                                📋
                            </button>
                        </div>
                        <button
                            onClick={() => setGeneratedKey(null)}
                            className="mt-3 text-sm text-gray-400 hover:text-white underline"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
