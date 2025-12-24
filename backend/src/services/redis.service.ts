/**
 * Redis Service
 * 
 * Provides caching and pub/sub functionality for production scaling.
 * Supports local Redis for development and Railway Redis for production.
 * 
 * Environment Variables:
 * - REDIS_URL: Full Redis connection URL (Railway provides this)
 * - REDIS_HOST: Redis host (default: localhost)
 * - REDIS_PORT: Redis port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 */

import Redis from 'ioredis';

class RedisService {
    private client: Redis | null = null;
    private subscriber: Redis | null = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;

    /**
     * Initialize Redis connection
     */
    async connect(): Promise<boolean> {
        if (this.client && this.isConnected) {
            return true;
        }

        try {
            const redisUrl = process.env.REDIS_URL;

            const options: any = {
                maxRetriesPerRequest: 3,
                retryDelayOnFailover: 100,
                enableReadyCheck: true,
                lazyConnect: true,
                // Reconnect strategy
                retryStrategy: (times: number) => {
                    if (times > this.maxReconnectAttempts) {
                        console.error('[Redis] Max reconnection attempts reached');
                        return null; // Stop retrying
                    }
                    const delay = Math.min(times * 100, 3000);
                    console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
                    return delay;
                }
            };

            if (redisUrl) {
                // Railway or full URL provided
                console.log('[Redis] Connecting via REDIS_URL...');
                this.client = new Redis(redisUrl, options);
            } else {
                // Local development
                const host = process.env.REDIS_HOST || 'localhost';
                const port = parseInt(process.env.REDIS_PORT || '6379');
                const password = process.env.REDIS_PASSWORD;

                console.log(`[Redis] Connecting to ${host}:${port}...`);
                this.client = new Redis({
                    host,
                    port,
                    password,
                    ...options
                });
            }

            // Event handlers
            this.client.on('connect', () => {
                console.log('[Redis] Connected successfully');
                this.isConnected = true;
                this.reconnectAttempts = 0;
            });

            this.client.on('error', (err) => {
                console.error('[Redis] Connection error:', err.message);
                this.isConnected = false;
            });

            this.client.on('close', () => {
                console.log('[Redis] Connection closed');
                this.isConnected = false;
            });

            await this.client.connect();
            return true;
        } catch (error: any) {
            console.error('[Redis] Failed to connect:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get Redis client (auto-connects if needed)
     */
    async getClient(): Promise<Redis | null> {
        if (!this.client || !this.isConnected) {
            await this.connect();
        }
        return this.client;
    }

    /**
     * Check if Redis is available
     */
    isAvailable(): boolean {
        return this.isConnected && this.client !== null;
    }

    // ============================================
    // CACHING METHODS
    // ============================================

    /**
     * Get cached value
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.isAvailable()) return null;
        try {
            const value = await this.client!.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`[Redis] Get error for ${key}:`, error);
            return null;
        }
    }

    /**
     * Set cached value with optional TTL (seconds)
     */
    async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
        if (!this.isAvailable()) return false;
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client!.setex(key, ttlSeconds, serialized);
            } else {
                await this.client!.set(key, serialized);
            }
            return true;
        } catch (error) {
            console.error(`[Redis] Set error for ${key}:`, error);
            return false;
        }
    }

    /**
     * Delete cached value
     */
    async del(key: string): Promise<boolean> {
        if (!this.isAvailable()) return false;
        try {
            await this.client!.del(key);
            return true;
        } catch (error) {
            console.error(`[Redis] Del error for ${key}:`, error);
            return false;
        }
    }

    /**
     * Delete all keys matching pattern
     */
    async delPattern(pattern: string): Promise<number> {
        if (!this.isAvailable()) return 0;
        try {
            const keys = await this.client!.keys(pattern);
            if (keys.length > 0) {
                await this.client!.del(...keys);
            }
            return keys.length;
        } catch (error) {
            console.error(`[Redis] DelPattern error for ${pattern}:`, error);
            return 0;
        }
    }

    // ============================================
    // USER CACHING HELPERS
    // ============================================

    /**
     * Cache user subscription status (5 min TTL)
     */
    async cacheUserSubscription(userId: string, data: any): Promise<void> {
        await this.set(`user:${userId}:subscription`, data, 300);
    }

    /**
     * Get cached user subscription
     */
    async getUserSubscription(userId: string): Promise<any | null> {
        return this.get(`user:${userId}:subscription`);
    }

    /**
     * Invalidate user cache (call after subscription changes)
     */
    async invalidateUserCache(userId: string): Promise<void> {
        await this.delPattern(`user:${userId}:*`);
    }

    /**
     * Cache market data (1 min TTL)
     */
    async cacheMarketData(symbol: string, data: any): Promise<void> {
        await this.set(`market:${symbol}`, data, 60);
    }

    /**
     * Get cached market data
     */
    async getMarketData(symbol: string): Promise<any | null> {
        return this.get(`market:${symbol}`);
    }

    // ============================================
    // RATE LIMITING HELPERS
    // ============================================

    /**
     * Increment rate limit counter
     */
    async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
        if (!this.isAvailable()) return 0;
        try {
            const current = await this.client!.incr(key);
            if (current === 1) {
                await this.client!.expire(key, windowSeconds);
            }
            return current;
        } catch (error) {
            console.error(`[Redis] Rate limit error:`, error);
            return 0;
        }
    }

    // ============================================
    // CLEANUP
    // ============================================

    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            this.isConnected = false;
        }
        if (this.subscriber) {
            await this.subscriber.quit();
            this.subscriber = null;
        }
    }

    /**
     * Health check
     */
    async ping(): Promise<boolean> {
        if (!this.isAvailable()) return false;
        try {
            const result = await this.client!.ping();
            return result === 'PONG';
        } catch {
            return false;
        }
    }
}

export const redisService = new RedisService();
export default redisService;
