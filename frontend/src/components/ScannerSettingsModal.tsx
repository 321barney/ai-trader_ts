
import { useState } from "react";
import { api, API_BASE } from "@/lib/api";

interface ScannerSettingsModalProps {
    activeModelId: string | null;
    currentTimeframes: string[];
    onClose: () => void;
    onSave: () => void;
}

export default function ScannerSettingsModal({ activeModelId, currentTimeframes, onClose, onSave }: ScannerSettingsModalProps) {
    const [timeframes, setTimeframes] = useState<string[]>(currentTimeframes);
    const [loading, setLoading] = useState(false);

    const availableTimeframes = ['1m', '5m', '15m', '1h', '4h'];

    const toggleTimeframe = (tf: string) => {
        if (timeframes.includes(tf)) {
            setTimeframes(timeframes.filter(t => t !== tf));
        } else {
            setTimeframes([...timeframes, tf]);
        }
    };

    const handleSave = async () => {
        if (!activeModelId) return;
        setLoading(true);
        try {
            const token = api.getAccessToken();
            await fetch(`${API_BASE}/api/models/${activeModelId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ timeframes })
            });
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to update scanner settings", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Scanner Settings</h3>
                <p className="text-gray-400 text-sm mb-6">
                    Select the timeframes to scan. The high-frequency scheduler checks these every minute and triggers analysis when a candle closes.
                </p>

                <div className="space-y-4 mb-8">
                    <div className="flex flex-wrap gap-3">
                        {availableTimeframes.map(tf => (
                            <button
                                key={tf}
                                onClick={() => toggleTimeframe(tf)}
                                className={`px-4 py-2 rounded-xl border transition-all ${timeframes.includes(tf)
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                                        : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-gray-400 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || !activeModelId}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
