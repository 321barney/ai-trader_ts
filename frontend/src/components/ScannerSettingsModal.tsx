
import { useState } from "react";
import { api, API_BASE } from "@/lib/api";

interface ScannerSettingsModalProps {
    activeModelId: string | null;
    currentTimeframes: string[];
    isModelActive?: boolean; // Whether the model is currently ACTIVE status
    onClose: () => void;
    onSave: () => void;
}

// All supported timeframes grouped by category
const TIMEFRAME_GROUPS: Record<string, string[]> = {
    'Minutes': ['1m', '3m', '5m', '15m', '30m'],
    'Hours': ['1h', '2h', '4h', '6h', '8h', '12h'],
    'Days+': ['1d', '3d', '1w']
};

export default function ScannerSettingsModal({
    activeModelId,
    currentTimeframes,
    isModelActive = false,
    onClose,
    onSave
}: ScannerSettingsModalProps) {
    const [timeframes, setTimeframes] = useState<string[]>(currentTimeframes);
    const [loading, setLoading] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    // Check if timeframes have changed
    const hasChanged = JSON.stringify([...timeframes].sort()) !== JSON.stringify([...currentTimeframes].sort());

    const toggleTimeframe = (tf: string) => {
        if (timeframes.includes(tf)) {
            setTimeframes(timeframes.filter(t => t !== tf));
        } else {
            setTimeframes([...timeframes, tf]);
        }
    };

    const handleSaveClick = () => {
        // If model is active AND timeframes changed, show warning first
        if (isModelActive && hasChanged) {
            setShowWarning(true);
        } else {
            performSave();
        }
    };

    const performSave = async () => {
        if (!activeModelId) return;
        setLoading(true);
        setShowWarning(false);
        try {
            const token = api.getAccessToken();
            const response = await fetch(`${API_BASE}/api/models/${activeModelId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    timeframes,
                    // Signal backend to reset status if TFs changed on active model
                    resetStatusOnChange: isModelActive && hasChanged
                })
            });
            const data = await response.json();
            if (data.statusReset) {
                alert('⚠️ Timeframes updated. Model status reset to DRAFT - please re-backtest before activating.');
            }
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
            <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Scanner Settings</h3>
                <p className="text-gray-400 text-sm mb-6">
                    Select the timeframes to scan. The scheduler triggers analysis when any selected candle closes.
                </p>

                {/* Warning banner for active models */}
                {isModelActive && hasChanged && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
                            <span>⚠️</span>
                            <span>Changing timeframes will reset this model to DRAFT status</span>
                        </div>
                        <p className="text-yellow-400/70 text-xs mt-1">
                            You will need to re-backtest before the model can be activated again.
                        </p>
                    </div>
                )}

                <div className="space-y-4 mb-8">
                    {Object.entries(TIMEFRAME_GROUPS).map(([group, tfs]) => (
                        <div key={group}>
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{group}</div>
                            <div className="flex flex-wrap gap-2">
                                {tfs.map(tf => (
                                    <button
                                        key={tf}
                                        onClick={() => toggleTimeframe(tf)}
                                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${timeframes.includes(tf)
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                                            : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-xs text-gray-500 mb-4">
                    Selected: <span className="text-orange-400">{timeframes.length > 0 ? timeframes.join(', ') : 'None'}</span>
                </div>

                {/* Confirmation Warning Dialog */}
                {showWarning && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                        <div className="text-red-400 font-bold mb-2">⚠️ Confirm Timeframe Change</div>
                        <p className="text-red-300/80 text-sm mb-3">
                            Changing timeframes on an active model will:
                        </p>
                        <ul className="text-red-300/80 text-sm list-disc list-inside mb-3">
                            <li>Reset the model status from <strong>ACTIVE</strong> to <strong>DRAFT</strong></li>
                            <li>Require you to re-run a backtest</li>
                            <li>Stop the model from generating signals until approved again</li>
                        </ul>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowWarning(false)}
                                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={performSave}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600"
                            >
                                Yes, Reset & Update
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    {!showWarning && (
                        <button
                            onClick={handleSaveClick}
                            disabled={loading || !activeModelId || timeframes.length === 0}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Configuration'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
