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
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-80 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-white/10">
                        <span className="font-bold text-white">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-indigo-400 hover:text-indigo-300"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <div className="text-3xl mb-2">🔕</div>
                                <div>No notifications</div>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => !notif.read && markAsRead(notif.id)}
                                    className={`p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${!notif.read ? 'bg-indigo-500/5' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <span className="text-xl">{getIcon(notif.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <span className={`font-medium ${!notif.read ? 'text-white' : 'text-gray-400'}`}>
                                                    {notif.title}
                                                </span>
                                                {!notif.read && (
                                                    <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">{notif.message}</p>
                                            <span className="text-xs text-gray-600">
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
