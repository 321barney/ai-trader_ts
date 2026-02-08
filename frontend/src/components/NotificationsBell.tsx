"use client";

import { useState, useEffect, useRef } from "react";
import { api, API_BASE } from "@/lib/api";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export default function NotificationsBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = api.getAccessToken();
            if (!token) return;

            const res = await fetch(`${API_BASE}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setNotifications(data.data.notifications || []);
                setUnreadCount(data.data.unreadCount || 0);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const token = api.getAccessToken();
            await fetch(`${API_BASE}/api/notifications/${id}/read`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = api.getAccessToken();
            await fetch(`${API_BASE}/api/notifications/read-all`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'TRADE_EXECUTED': return '💹';
            case 'SIGNAL_GENERATED': return '📡';
            case 'TP_HIT': return '🎯';
            case 'SL_HIT': return '🛑';
            case 'DRAWDOWN_WARNING': return '⚠️';
            case 'BACKTEST_COMPLETE': return '✅';
            default: return '🔔';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
            >
                <span className="text-xl filter grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold border-2 border-[#020408]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-80 bg-[#0b1121] border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black/5">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-[#020408]/50">
                        <span className="font-bold text-slate-100 font-mono text-sm uppercase tracking-wider">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                MARK ALL READ
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <div className="text-3xl mb-2 opacity-30">🔕</div>
                                <div className="text-sm font-medium uppercase tracking-wider">No notifications</div>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => !notif.read && markAsRead(notif.id)}
                                    className={`p-4 border-b border-slate-800/50 hover:bg-slate-800/50 cursor-pointer transition-colors ${!notif.read ? 'bg-blue-500/5' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <span className="text-lg filter grayscale opacity-80">{getIcon(notif.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <span className={`text-sm font-medium font-mono ${!notif.read ? 'text-slate-200' : 'text-slate-500'}`}>
                                                    {notif.title}
                                                </span>
                                                {!notif.read && (
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed truncate">{notif.message}</p>
                                            <span className="text-[10px] text-slate-600 mt-2 block font-mono">
                                                {new Date(notif.createdAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
