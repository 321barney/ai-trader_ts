/**
 * Strategy Service
 * Manages strategy versions, testing, and promotion to live.
 */

import { prisma } from '../utils/prisma.js';
import { StrategyStatus } from '@prisma/client';

export class StrategyService {

    /**
     * Create a new strategy draft
     */
    async createDraft(userId: string, baseMethodology: string, params: any) {
        // Deactivate other drafts? No, simple CRUD.

        return await prisma.strategyVersion.create({
            data: {
                userId,
                version: await this.getNextVersionNumber(userId),
                baseMethodology,
                rules: params,
                learnings: [],
                metrics: {},
                active: false,
                status: 'DRAFT'
            }
        });
    }

    /**
     * Get the next version number for a user
     */
    private async getNextVersionNumber(userId: string): Promise<number> {
        const last = await prisma.strategyVersion.findFirst({
            where: { userId },
            orderBy: { version: 'desc' },
            select: { version: true }
        });
        return (last?.version || 0) + 1;
    }

    /**
     * Get active strategy for user
     */
    async getActiveStrategy(userId: string) {
        return await prisma.strategyVersion.findFirst({
            where: { userId, status: 'ACTIVE' }
        });
    }

    /**
     * Promote a strategy version to ACTIVE
     * (archives the previously active one)
     */
    async promoteToActive(userId: string, versionId: string) {
        // 1. Verify it's tested
        const version = await prisma.strategyVersion.findUnique({
            where: { id: versionId }
        });

        if (!version) throw new Error('Version not found');
        if (version.status !== 'TESTED' && version.status !== 'ACTIVE') {
            // Enforce: Strategy must be tested (approved) before activation
            throw new Error('Strategy must be tested and approved before activation. Please run a backtest first.');
        }

        // 2. Transaction to update
        return await prisma.$transaction(async (tx) => {
            // Archive current active
            await tx.strategyVersion.updateMany({
                where: { userId, status: 'ACTIVE' },
                data: { status: 'ARCHIVED', active: false }
            });

            // Activate new one
            return await tx.strategyVersion.update({
                where: { id: versionId },
                data: { status: 'ACTIVE', active: true }
            });
        });
    }

    /**
     * Mark strategy as tested (only if backtest was completed)
     */
    async markAsTested(versionId: string) {
        // First verify backtest was actually completed
        const version = await prisma.strategyVersion.findUnique({
            where: { id: versionId }
        });

        if (!version) {
            throw new Error('Strategy version not found');
        }

        if (!version.backtestCompleted) {
            throw new Error('Cannot mark as tested: Please complete a backtest first');
        }

        return await prisma.strategyVersion.update({
            where: { id: versionId },
            data: {
                status: 'TESTED',
                lastTestedAt: new Date()
            }
        });
    }

    /**
     * Mark backtest as completed (called from replay service)
     */
    async markBacktestCompleted(versionId: string) {
        return await prisma.strategyVersion.update({
            where: { id: versionId },
            data: {
                backtestCompleted: true
            }
        });
    }

    /**
     * Get all versions for user
     */
    async getVersions(userId: string) {
        return await prisma.strategyVersion.findMany({
            where: { userId },
            orderBy: { version: 'desc' }
        });
    }

    // --- Helpers for TradingPipeline ---

    async getCurrentStrategy(userId: string) {
        return this.getActiveStrategy(userId);
    }

    async createFromMethodology(userId: string, methodology: string) {
        // Create a default active strategy for the user based on methodology
        const rules = this.getDefaultRules(methodology);

        return await prisma.strategyVersion.create({
            data: {
                userId,
                version: await this.getNextVersionNumber(userId),
                baseMethodology: methodology,
                rules,
                learnings: [],
                metrics: {},
                active: true,
                status: 'ACTIVE' // Auto-active if created by system/pipeline fallback
            }
        });
    }

    formatRulesForPrompt(strategy: any): string {
        if (!strategy || !strategy.rules) return '';
        return JSON.stringify(strategy.rules, null, 2);
    }

    private getDefaultRules(methodology: string) {
        switch (methodology) {
            case 'SMC': return { risk: 'low', focus: ['order_blocks', 'fvg'] };
            case 'ICT': return { risk: 'medium', focus: ['kill_zones', 'silver_bullet'] };
            case 'Gann': return { risk: 'high', focus: ['angles', 'squares'] };
            default: return { risk: 'medium', focus: ['rsi', 'macd'] };
        }
    }

    /**
     * Delete a strategy version
     * Cannot delete ACTIVE strategies
     */
    async deleteStrategy(userId: string, strategyId: string) {
        // 1. Find the strategy
        const strategy = await prisma.strategyVersion.findUnique({
            where: { id: strategyId }
        });

        if (!strategy) {
            throw new Error('Strategy not found');
        }

        if (strategy.userId !== userId) {
            throw new Error('Unauthorized - this strategy belongs to another user');
        }

        if (strategy.status === 'ACTIVE') {
            throw new Error('Cannot delete an ACTIVE strategy. Please deactivate it first or create a new active strategy.');
        }

        // 2. Delete associated backtest sessions first
        await prisma.backtestSession.deleteMany({
            where: { strategyVersionId: strategyId }
        });

        // 3. Delete the strategy
        const deleted = await prisma.strategyVersion.delete({
            where: { id: strategyId }
        });

        console.log(`[Strategy] Deleted strategy ${strategyId} (v${strategy.version}) for user ${userId}`);

        return deleted;
    }
}

export type { StrategyVersion } from '@prisma/client';


export const strategyService = new StrategyService();
