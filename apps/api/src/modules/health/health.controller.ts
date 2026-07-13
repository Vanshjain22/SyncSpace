import { type Request, type Response } from "express";

import { env } from "@/config/env";
import { checkRedisHealth } from "@/infrastructure/cache/redisClient";
import { checkDatabaseHealth } from "@/infrastructure/database/prismaClient";

interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    redis: "connected" | "disconnected";
  };
}

/**
 * GET /api/health
 *
 * Returns API health status including uptime, version, and
 * connectivity to Postgres and Redis. Used by load balancers,
 * Docker health checks, and monitoring services.
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  const [dbHealthy, redisHealthy] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const allHealthy = dbHealthy && redisHealthy;
  const anyDown = !dbHealthy || !redisHealthy;

  const status: HealthCheckResponse["status"] = allHealthy ? "ok" : anyDown ? "degraded" : "error";

  const httpStatus = allHealthy ? 200 : 503;

  const response: HealthCheckResponse = {
    status,
    version: env.APP_VERSION,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? "connected" : "disconnected",
      redis: redisHealthy ? "connected" : "disconnected",
    },
  };

  res.status(httpStatus).json(response);
}
