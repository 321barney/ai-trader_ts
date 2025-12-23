/**
 * Notification Service
 * 
 * User alerts for trades, signals, TP/SL hits, drawdown warnings
 */

import { prisma } from '../utils/prisma.js';

// Cast prisma to any for unmigrated models
const db = prisma as any;

export type NotificationType =
    | 'TRADE_EXECUTED'
    | 'SIGNAL_GENERATED'
    | 'TP_HIT'
    | 'SL_HIT'
    | 'DRAWDOWN_WARNING'
    | 'POSITION_CLOSED'
    | 'MODEL_APPROVED'
    | 'BACKTEST_COMPLETE';

export interface Notification {
    id?: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
    read: boolean;
    createdAt: Date;
}

class NotificationService {
    private listeners: Map<string, ((notification: Notification) => void)[]> = new Map();

    async send(
        userId: string,
        type: NotificationType,
        title: string,
        message: string,
        data?: any
    ): Promise<void> {
        const notification: Notification = {
            userId,
            type,
            title,
            message,
            data,
            read: false,
            createdAt: new Date()
        };

        try {
            await db.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    data: data ? JSON.stringify(data) : null,
                    read: false
                }
            });
        } catch (error) {
            console.log(`[Notification] ${type}: ${title} - ${message}`);
        }

        const userListeners = this.listeners.get(userId) || [];
        for (const listener of userListeners) {
            listener(notification);
        }

        console.log(`[Notification] ${userId}: ${title}`);
    }

    async tradeExecuted(userId: string, symbol: string, side: string, price: number): Promise<void> {
        await this.send(userId, 'TRADE_EXECUTED', `${side} ${symbol} Executed`, `Trade executed at $${price.toFixed(2)}`, { symbol, side, price });
    }

    async signalGenerated(userId: string, symbol: string, direction: string, confidence: number): Promise<void> {
        await this.send(userId, 'SIGNAL_GENERATED', `New ${direction} Signal: ${symbol}`, `Confidence: ${(confidence * 100).toFixed(0)}%`, { symbol, direction, confidence });
    }

    async tpHit(userId: string, symbol: string, pnl: number): Promise<void> {
        await this.send(userId, 'TP_HIT', `🎯 Take Profit Hit: ${symbol}`, `Profit: $${pnl.toFixed(2)}`, { symbol, pnl });
    }

    async slHit(userId: string, symbol: string, pnl: number): Promise<void> {
        await this.send(userId, 'SL_HIT', `🛑 Stop Loss Hit: ${symbol}`, `Loss: $${Math.abs(pnl).toFixed(2)}`, { symbol, pnl });
    }

    async drawdownWarning(userId: string, drawdown: number): Promise<void> {
        await this.send(userId, 'DRAWDOWN_WARNING', `⚠️ Drawdown Alert`, `Drawdown: ${drawdown.toFixed(1)}%`, { drawdown });
    }

    async backtestComplete(userId: string, modelVersion: number, totalReturn: number): Promise<void> {
        await this.send(userId, 'BACKTEST_COMPLETE', `Backtest Complete: v${modelVersion}`, `Return: ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`, { modelVersion, totalReturn });
    }

    addListener(userId: string, callback: (notification: Notification) => void): void {
        if (!this.listeners.has(userId)) {
            this.listeners.set(userId, []);
        }
        this.listeners.get(userId)!.push(callback);
    }

    removeListener(userId: string, callback: (notification: Notification) => void): void {
        const userListeners = this.listeners.get(userId);
        if (userListeners) {
            const index = userListeners.indexOf(callback);
            if (index > -1) userListeners.splice(index, 1);
        }
    }

    async getUnread(userId: string): Promise<Notification[]> {
        try {
            return await db.notification.findMany({
                where: { userId, read: false },
                orderBy: { createdAt: 'desc' },
                take: 20
            }) as unknown as Notification[];
        } catch (error) {
            return [];
        }
    }

    async markRead(notificationId: string): Promise<void> {
        try {
            await db.notification.update({
                where: { id: notificationId },
                data: { read: true }
            });
        } catch (error) { }
    }

    async markAllRead(userId: string): Promise<void> {
        try {
            await db.notification.updateMany({
                where: { userId, read: false },
                data: { read: true }
            });
        } catch (error) { }
    }
}

export const notificationService = new NotificationService();
