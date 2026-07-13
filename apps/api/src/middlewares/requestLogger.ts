import { type NextFunction, type Request, type Response } from "express";

import { logger } from "@/infrastructure/logger";

/**
 * Per-request HTTP logging middleware.
 *
 * Logs method, URL, status code, and response duration for every request.
 * Attaches a unique request ID (via x-request-id header) for distributed tracing.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();

  // Attach request ID for tracing
  const requestId = (req.headers["x-request-id"] as string) ?? generateRequestId();
  req.headers["x-request-id"] = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - startTime;
    const durationMs = Number(durationNs) / 1_000_000;

    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, "Request completed with server error");
    } else if (res.statusCode >= 400) {
      logger.warn(logData, "Request completed with client error");
    } else {
      logger.info(logData, "Request completed");
    }
  });

  next();
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
