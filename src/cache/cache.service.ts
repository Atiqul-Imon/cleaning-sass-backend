import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClientType;
  private isConnected = false;

  async onModuleInit() {
    // Skip Redis if not configured
    if (!process.env.REDIS_HOST) {
      console.log('ℹ️  Redis not configured, caching disabled');
      return;
    }

    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              this.isConnected = false;
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
        password: process.env.REDIS_PASSWORD,
      });

      this.client.on('error', (err) => {
        console.warn('Redis Client Error (non-critical):', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✓ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        this.isConnected = false;
      });

      // Connect with timeout - don't block app startup
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000)),
      ]).catch((error) => {
        console.warn(
          'Redis connection failed (cache disabled):',
          error instanceof Error ? error.message : String(error),
        );
        this.isConnected = false;
      });
    } catch (error) {
      console.warn(
        'Redis initialization failed (cache disabled):',
        error instanceof Error ? error.message : String(error),
      );
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | undefined> {
    if (!this.isConnected) {
      return undefined;
    }
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      console.warn('Cache get error:', key, error);
      return undefined;
    }
  }

  /**
   * Set cache value with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    try {
      const ttlSeconds = Math.floor((ttl || 5 * 60 * 1000) / 1000);
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.warn('Cache set error:', key, error);
    }
  }

  /**
   * Delete a single cache key
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      console.warn('Cache delete error:', key, error);
    }
  }

  /**
   * Delete multiple cache keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.warn('Cache pattern delete error:', pattern, error);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    try {
      await this.client.flushDb();
    } catch (error) {
      console.warn('Cache reset error:', error);
    }
  }

  /**
   * Wrap a function with caching
   * If cache exists, return it. Otherwise, execute function and cache result.
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Generate cache key for business-specific data
   */
  generateKey(prefix: string, businessId: string, suffix?: string): string {
    return suffix ? `${prefix}:${businessId}:${suffix}` : `${prefix}:${businessId}`;
  }

  /**
   * Invalidate all cache keys for a specific business
   */
  async invalidateBusinessCache(businessId: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    // Clear common business-related cache patterns
    const patterns = [
      `dashboard:*:${businessId}*`,
      `clients:${businessId}*`,
      `jobs:${businessId}*`,
      `invoices:${businessId}*`,
      `cleaners:${businessId}*`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }
}
