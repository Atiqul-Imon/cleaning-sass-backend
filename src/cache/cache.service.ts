import { Injectable, Scope } from '@nestjs/common';

/**
 * Simple in-memory cache service for request-scoped caching
 * This helps avoid repeated database queries within the same request
 */
@Injectable({ scope: Scope.REQUEST })
export class CacheService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 60000; // 1 minute TTL for request cache

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}





