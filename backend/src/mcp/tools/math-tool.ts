/**
 * Math Tool
 * 
 * MCP tool for mathematical calculations.
 * Useful for position sizing, risk calculations, etc.
 */

import { MCPTool, ToolResult, ToolContext, toolRegistry } from '../tool-registry.js';

// ============================================
// CALCULATE Tool
// ============================================

const calculateTool: MCPTool = {
    name: 'calculate',
    description: 'Perform mathematical calculations. Supports basic arithmetic, percentages, and financial calculations.',
    category: 'utility',
    parameters: [
        {
            name: 'expression',
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "100 * 1.05", "10000 * 0.02")',
            required: true,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { expression } = params;

        try {
            // Safe math evaluation (no eval)
            const result = safeEvaluate(expression);

            return {
                success: true,
                data: {
                    expression,
                    result,
                },
                timestamp: new Date(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Calculation failed: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// POSITION_SIZE Tool
// ============================================

const positionSizeTool: MCPTool = {
    name: 'position_size',
    description: 'Calculate optimal position size based on risk parameters.',
    category: 'utility',
    parameters: [
        {
            name: 'account_balance',
            type: 'number',
            description: 'Total account balance',
            required: true,
        },
        {
            name: 'risk_percent',
            type: 'number',
            description: 'Percentage of account to risk (e.g., 2 for 2%)',
            required: true,
        },
        {
            name: 'entry_price',
            type: 'number',
            description: 'Entry price',
            required: true,
        },
        {
            name: 'stop_loss',
            type: 'number',
            description: 'Stop loss price',
            required: true,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { account_balance, risk_percent, entry_price, stop_loss } = params;

        try {
            const riskAmount = account_balance * (risk_percent / 100);
            const riskPerUnit = Math.abs(entry_price - stop_loss);

            if (riskPerUnit === 0) {
                return {
                    success: false,
                    error: 'Entry price and stop loss cannot be the same',
                    timestamp: new Date(),
                };
            }

            const positionSize = riskAmount / riskPerUnit;
            const positionValue = positionSize * entry_price;
            const leverage = positionValue / account_balance;

            return {
                success: true,
                data: {
                    positionSize: Math.floor(positionSize * 1000) / 1000, // Round to 3 decimals
                    positionValue: Math.round(positionValue * 100) / 100,
                    riskAmount: Math.round(riskAmount * 100) / 100,
                    riskPerUnit: Math.round(riskPerUnit * 100) / 100,
                    effectiveLeverage: Math.round(leverage * 100) / 100,
                },
                timestamp: new Date(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Position size calculation failed: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// RISK_REWARD Tool
// ============================================

const riskRewardTool: MCPTool = {
    name: 'risk_reward',
    description: 'Calculate risk/reward ratio for a trade.',
    category: 'utility',
    parameters: [
        {
            name: 'entry_price',
            type: 'number',
            description: 'Entry price',
            required: true,
        },
        {
            name: 'stop_loss',
            type: 'number',
            description: 'Stop loss price',
            required: true,
        },
        {
            name: 'take_profit',
            type: 'number',
            description: 'Take profit price',
            required: true,
        },
        {
            name: 'side',
            type: 'string',
            description: 'Trade direction',
            required: false,
            default: 'LONG',
            enum: ['LONG', 'SHORT'],
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { entry_price, stop_loss, take_profit, side = 'LONG' } = params;

        try {
            let risk: number;
            let reward: number;

            if (side === 'LONG') {
                risk = entry_price - stop_loss;
                reward = take_profit - entry_price;
            } else {
                risk = stop_loss - entry_price;
                reward = entry_price - take_profit;
            }

            if (risk <= 0) {
                return {
                    success: false,
                    error: 'Invalid stop loss placement',
                    timestamp: new Date(),
                };
            }

            const ratio = reward / risk;
            const riskPercent = (risk / entry_price) * 100;
            const rewardPercent = (reward / entry_price) * 100;

            return {
                success: true,
                data: {
                    riskRewardRatio: Math.round(ratio * 100) / 100,
                    riskAmount: Math.round(risk * 100) / 100,
                    rewardAmount: Math.round(reward * 100) / 100,
                    riskPercent: Math.round(riskPercent * 100) / 100,
                    rewardPercent: Math.round(rewardPercent * 100) / 100,
                    recommendation: ratio >= 2
                        ? 'Good - R:R ratio is 2:1 or better'
                        : ratio >= 1.5
                            ? 'Acceptable - Consider if conviction is high'
                            : 'Poor - R:R ratio below 1.5:1 is risky',
                },
                timestamp: new Date(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Risk/reward calculation failed: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// COMPOUND_RETURN Tool
// ============================================

const compoundReturnTool: MCPTool = {
    name: 'compound_return',
    description: 'Calculate compound returns over time.',
    category: 'utility',
    parameters: [
        {
            name: 'initial_capital',
            type: 'number',
            description: 'Starting capital',
            required: true,
        },
        {
            name: 'return_percent',
            type: 'number',
            description: 'Expected return per period (percentage)',
            required: true,
        },
        {
            name: 'periods',
            type: 'number',
            description: 'Number of periods',
            required: true,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { initial_capital, return_percent, periods } = params;

        try {
            const rate = return_percent / 100;
            const finalValue = initial_capital * Math.pow(1 + rate, periods);
            const totalReturn = ((finalValue - initial_capital) / initial_capital) * 100;

            return {
                success: true,
                data: {
                    initialCapital: initial_capital,
                    finalValue: Math.round(finalValue * 100) / 100,
                    totalReturn: Math.round(totalReturn * 100) / 100,
                    growthMultiple: Math.round((finalValue / initial_capital) * 100) / 100,
                },
                timestamp: new Date(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Compound return calculation failed: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// Safe Math Evaluator
// ============================================

function safeEvaluate(expression: string): number {
    // Remove all whitespace
    const cleaned = expression.replace(/\s+/g, '');

    // Only allow numbers, operators, parentheses, and decimal points
    if (!/^[\d\+\-\*\/\(\)\.\%]+$/.test(cleaned)) {
        throw new Error('Invalid characters in expression');
    }

    // Handle percentages (e.g., "100 * 5%" = "100 * 0.05")
    const withPercent = cleaned.replace(/(\d+)%/g, '($1/100)');

    // Use Function constructor for safe evaluation
    try {
        const result = new Function(`return ${withPercent}`)();
        if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
            throw new Error('Invalid result');
        }
        return result;
    } catch {
        throw new Error('Failed to evaluate expression');
    }
}

// ============================================
// Register Tools
// ============================================

export function registerMathTools(): void {
    toolRegistry.registerTool(calculateTool);
    toolRegistry.registerTool(positionSizeTool);
    toolRegistry.registerTool(riskRewardTool);
    toolRegistry.registerTool(compoundReturnTool);
}

// Auto-register on import
registerMathTools();
