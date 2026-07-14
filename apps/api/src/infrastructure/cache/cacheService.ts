import { logger } from "@/infrastructure/logger";

import { redis } from "./redisClient";

export class CacheService {
  private defaultTtl = 3600; // 1 hour default TTL in seconds

  /**
   * Fetch a value from Redis cache.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error({ err: error, key }, "CacheService: failed to get key");
      return null;
    }
  }

  /**
   * Save a value in Redis cache with an optional TTL.
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const stringified = JSON.stringify(value);
      const ttl = ttlSeconds ?? this.defaultTtl;
      await redis.set(key, stringified, "EX", ttl);
    } catch (error) {
      logger.error({ err: error, key }, "CacheService: failed to set key");
    }
  }

  /**
   * Delete a key from Redis cache.
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error({ err: error, key }, "CacheService: failed to delete key");
    }
  }

  /**
   * Invalidate all cached data for a project (board layout and analytics).
   */
  async invalidateProjectCache(projectId: string): Promise<void> {
    try {
      const boardKey = `project:${projectId}:board`;
      const analyticsKey = `project:${projectId}:analytics`;
      await Promise.all([this.del(boardKey), this.del(analyticsKey)]);
      logger.info({ projectId }, "CacheService: invalidated project board and analytics caches");
    } catch (error) {
      logger.error({ err: error, projectId }, "CacheService: failed to invalidate project cache");
    }
  }
}

export const cacheService = new CacheService();
