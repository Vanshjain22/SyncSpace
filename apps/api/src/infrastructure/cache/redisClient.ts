import Redis from "ioredis";

import { env } from "@/config/env";
import { logger } from "@/infrastructure/logger";

/**
 * Singleton Redis client built on ioredis.
 *
 * ioredis handles connection retries automatically. We configure
 * a maximum retry strategy and log connection events to pino.
 */

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    reconnectOnError(err) {
      const targetErrors = ["READONLY", "ECONNRESET"];
      return targetErrors.some((target) => err.message.includes(target));
    },
    retryStrategy(times) {
      if (times > 10) {
        logger.error("Redis: max reconnection attempts reached — giving up");
        return null; // Stop retrying
      }
      const delay = Math.min(times * 100, 3000);
      logger.warn({ attempt: times, delayMs: delay }, "Redis: reconnecting...");
      return delay;
    },
    lazyConnect: true,
  });

  redisClient.on("connect", () => {
    logger.info("Redis: connected");
  });

  redisClient.on("ready", () => {
    logger.info("Redis: ready to accept commands");
  });

  redisClient.on("error", (err: Error) => {
    logger.error({ err }, "Redis: connection error");
  });

  redisClient.on("close", () => {
    logger.warn("Redis: connection closed");
  });

  redisClient.on("reconnecting", () => {
    logger.info("Redis: attempting to reconnect...");
  });

  return redisClient;
}

// Eagerly export for use throughout the app
export const redis = getRedisClient();

/**
 * Tests Redis connectivity — used in health checks.
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

/**
 * Gracefully disconnects Redis — call this in shutdown handlers.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis connection closed");
  }
}
