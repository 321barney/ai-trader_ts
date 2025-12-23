/**
 * Risk Manager Service
 * 
 * Real-time risk monitoring:
 * - Position limits
 * - Exposure checks
 * - Drawdown monitoring
 */

import { prisma } from '../utils/prisma.js';
import { notificationService } from './notification.service.js';
import { positionManager } from './position-manager.service.js';

const db = prisma as any;

export interface RiskLimits {
    maxPositions: number;
    maxExposurePercent: number;
    maxPositionSizePercent: number;
    maxDrawdownPercent: number;
    dailyLossLimitPercent: number;
}

export interface RiskStatus {
    withinLimits: boolean;
    currentDrawdown: number;
    dailyPnl: number;
    openPositions: number;
    exposurePercent: number;
    violations: string[];
}

const DEFAULT_LIMITS: RiskLimits = {
    maxPositions: 5,
    maxExposurePercent: 50,
    maxPositionSizePercent: 20,
    maxDrawdownPercent: 15,
    dailyLossLimitPercent: 5
};

class RiskManagerService {
    private isRunning = false;
    private monitorInterval: NodeJS.Timeout | null = null;
    private peakEquity: Map<string, number> = new Map();

    /**
     * Start risk monitoring
     */
    async start(): Promise<void> {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log('[RiskManager] Starting risk monitor');

        this.monitorInterval = setInterval(async () => {
            await this.monitorAllUsers();
        }, 10000); // Every 10 seconds
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isRunning = false;
    }

    /**
     * Monitor all active users
     */
    private async monitorAllUsers(): Promise<void> {
        try {
            const usersWithPositions = await db.position.findMany({
                where: { status: 'OPEN' },
                select: { userId: true },
                distinct: ['userId']
            });

            for (const { userId } of usersWithPositions) {
                await this.checkUserRisk(userId);
            }
        } catch (error) {
            console.error('[RiskManager] Monitor error:', error);
        }
    }

    /**
     * Check risk for a specific user
     */
    async checkUserRisk(userId: string): Promise<RiskStatus> {
        const violations: string[] = [];

        // Get user's risk settings
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                maxDrawdownPercent: true,
                maxRiskPerTrade: true,
                tradingCapitalPercent: true
            }
        });

        const limits: RiskLimits = {
            ...DEFAULT_LIMITS,
            maxDrawdownPercent: user?.maxDrawdownPercent || DEFAULT_LIMITS.maxDrawdownPercent,
            maxPositionSizePercent: user?.maxRiskPerTrade || DEFAULT_LIMITS.maxPositionSizePercent
        };

        // Get open positions
        const openPositions = await db.position.findMany({
            where: { userId, status: 'OPEN' }
        });

        // Check position count limit
        if (openPositions.length >= limits.maxPositions) {
            violations.push(`Max positions (${limits.maxPositions}) reached`);
        }

        // Calculate current equity and drawdown
        const totalPnl = openPositions.reduce((sum: number, p: any) => sum + (p.unrealizedPnl || 0), 0);
        const accountSize = 10000; // TODO: Get from actual balance
        const currentEquity = accountSize + totalPnl;

        // Track peak equity for drawdown calculation
        const peakEquity = this.peakEquity.get(userId) || accountSize;
        if (currentEquity > peakEquity) {
            this.peakEquity.set(userId, currentEquity);
        }

        const currentDrawdown = ((peakEquity - currentEquity) / peakEquity) * 100;

        // Check drawdown limit
        if (currentDrawdown >= limits.maxDrawdownPercent) {
            violations.push(`Max drawdown (${limits.maxDrawdownPercent}%) exceeded`);

            // Send warning notification
            await notificationService.drawdownWarning(userId, currentDrawdown);

            // Close all positions if drawdown is critical
            if (currentDrawdown >= limits.maxDrawdownPercent * 1.2) {
                console.log(`[RiskManager] Critical drawdown for ${userId}, closing all positions`);
                for (const pos of openPositions) {
                    await positionManager.closePosition(pos, 'LIQUIDATED', pos.currentPrice || pos.entryPrice);
                }
            }
        }

        // Calculate daily PnL
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyPnlResult = await db.position.aggregate({
            where: {
                userId,
                status: 'CLOSED',
                closedAt: { gte: today }
            },
            _sum: { realizedPnl: true }
        });
        const dailyPnl = dailyPnlResult._sum?.realizedPnl || 0;

        // Check daily loss limit
        const dailyLossLimit = accountSize * (limits.dailyLossLimitPercent / 100);
        if (dailyPnl < -dailyLossLimit) {
            violations.push(`Daily loss limit (${limits.dailyLossLimitPercent}%) exceeded`);
        }

        // Calculate exposure
        const totalExposure = openPositions.reduce((sum: number, p: any) => {
            return sum + (p.size * (p.currentPrice || p.entryPrice));
        }, 0);
        const exposurePercent = (totalExposure / accountSize) * 100;

        if (exposurePercent >= limits.maxExposurePercent) {
            violations.push(`Max exposure (${limits.maxExposurePercent}%) exceeded`);
        }

        return {
            withinLimits: violations.length === 0,
            currentDrawdown,
            dailyPnl,
            openPositions: openPositions.length,
            exposurePercent,
            violations
        };
    }

    /**
     * Check if a new trade is allowed
     */
    async canOpenTrade(userId: string, positionSize: number): Promise<{ allowed: boolean; reason?: string }> {
        const riskStatus = await this.checkUserRisk(userId);

        if (!riskStatus.withinLimits) {
            return { allowed: false, reason: riskStatus.violations[0] };
        }

        if (riskStatus.currentDrawdown > DEFAULT_LIMITS.maxDrawdownPercent * 0.8) {
            return { allowed: false, reason: 'Approaching max drawdown limit' };
        }

        return { allowed: true };
    }

    getStatus() {
        return { running: this.isRunning };
    }
}

export const riskManager = new RiskManagerService();
