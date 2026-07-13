import { PrismaClient } from "@prisma/client";

import { env } from "@/config/env";
import { logger } from "@/infrastructure/logger";

/**
 * Singleton Prisma client.
 *
 * In development, we attach the client to the global object to
 * prevent multiple client instances during hot-reload cycles.
 *
 * In production, we always create a single module-level instance.
 */

declare global {
   
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [
            { level: "query", emit: "event" },
            { level: "error", emit: "event" },
            { level: "warn", emit: "event" },
          ]
        : [
            { level: "error", emit: "event" },
          ],
  });

  // Log slow queries in development
  if (env.NODE_ENV === "development") {
    client.$on("query", (e) => {
      if (e.duration > 500) {
        logger.warn(
          { query: e.query, params: e.params, duration: `${e.duration}ms` },
          "Slow Prisma query detected",
        );
      }
    });
  }

  client.$on("error", (e) => {
    logger.error({ message: e.message }, "Prisma client error");
  });

  return client;
}

export const prisma: PrismaClient =
  env.NODE_ENV === "production"
    ? createPrismaClient()
    : (globalThis.__prisma ??= createPrismaClient());

/**
 * Gracefully disconnects Prisma — call this in shutdown handlers.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database connection closed");
}

/**
 * Tests database connectivity — used in health checks.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
