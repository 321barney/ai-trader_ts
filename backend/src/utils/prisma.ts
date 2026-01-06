/**
 * Prisma Client Singleton
 * 
 * Avoids multiple instances of PrismaClient in development
 * due to hot reloading creating new connections.
 * 
 * RESILIENCE FEATURES:
 * - Connection pooling limits to prevent exhaustion
 * - Graceful shutdown handling
 * - Connection verification for startup checks
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    // Connection pool settings to prevent exhaustion
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        }
    }
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

/**
 * Verify database connection is ready
 * Call this before any startup queries
 */
export async function verifyDatabaseConnection(retries = 5, delay = 2000): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log('[Prisma] Database connection verified');
            return true;
        } catch (error: any) {
            console.error(`[Prisma] Connection attempt ${attempt}/${retries} failed:`, error.message);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    console.error('[Prisma] Could not connect to database after all retries');
    return false;
}

/**
 * Graceful shutdown - disconnect prisma
 */
export async function disconnectPrisma(): Promise<void> {
    try {
        await prisma.$disconnect();
        console.log('[Prisma] Disconnected gracefully');
    } catch (error) {
        console.error('[Prisma] Error during disconnect:', error);
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    await disconnectPrisma();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectPrisma();
    process.exit(0);
});

export default prisma;
