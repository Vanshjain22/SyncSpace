import { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { env } from "@/config/env";
import { AppError } from "@/core/errors/AppError";
import { logger } from "@/infrastructure/logger";

/**
 * Global Express error handler.
 *
 * Must be registered LAST as an Express middleware (4 arguments).
 * Handles three categories:
 *
 * 1. AppError instances (operational errors) — safe to expose to client
 * 2. ZodError instances — validation failures from request parsing
 * 3. Unknown errors (programmer errors / unhandled exceptions) — sanitized response
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express requires the 4th parameter even if unused — do not remove

  _next: NextFunction,
): void {
  // ─── Zod Validation Errors ──────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};

    for (const issue of err.issues) {
      const path = issue.path.join(".");
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    }

    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details,
      },
      statusCode: 422,
    });
    return;
  }

  // ─── Operational AppErrors ─────────────────────────────────────────────────
  if (err instanceof AppError) {
    if (!err.isOperational) {
      // Log programmer errors with full context
      logger.error(
        {
          err,
          req: { method: req.method, url: req.url, body: req.body },
        },
        "Non-operational error encountered",
      );
    }

    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // ─── Unknown / Unhandled Errors ─────────────────────────────────────────────
  logger.error(
    {
      err,
      req: { method: req.method, url: req.url },
    },
    "Unhandled error",
  );

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err instanceof Error
            ? err.message
            : "Unknown error",
    },
    statusCode: 500,
  });
}
