/**
 * Validation Utilities
 */

import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
    username: z.string().min(3).max(30),
    email: z.string().email(),
    password: z.string().min(8),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// Onboarding Schemas
export const onboardingStep1Schema = z.object({
    asterApiKey: z.string().min(1),
    asterApiSecret: z.string().min(1),
    asterTestnet: z.boolean().optional().default(true),
});

export const onboardingStep2Schema = z.object({
    leverage: z.number().min(1).max(100),
});

export const onboardingStep3Schema = z.object({
    selectedPairs: z.array(z.string()).min(1),
});

export const onboardingStep4Schema = z.object({
    marketType: z.enum(['perp', 'spot']),
});

export const onboardingStep5Schema = z.object({
    methodology: z.enum(['SMC', 'ICT', 'Gann', 'Custom']),
});

export const onboardingStep6Schema = z.object({
    deepseekApiKey: z.string().optional(),
});

// Trading Schemas
export const tradingSettingsSchema = z.object({
    tradingEnabled: z.boolean(),
    tradingMode: z.enum(['signal', 'trade']),
    strategyMode: z.enum(['deepseek', 'rl', 'hybrid']).optional(),
});

// Helper function
export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
    try {
        const result = schema.parse(data);
        return { success: true, data: result };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors.map(e => e.message).join(', ') };
        }
        return { success: false, error: 'Validation failed' };
    }
}
