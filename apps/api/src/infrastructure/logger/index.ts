import pino from "pino";

import { env } from "@/config/env";

/**
 * Application logger powered by pino.
 *
 * - Development: pretty-printed, human-readable output with colors
 * - Production:  structured JSON for log aggregation services (Datadog, Logtail, etc.)
 *
 * Always use this logger — never use console.log in application code.
 */
export const logger = pino({
  name: "syncspace-api",
  level: env.NODE_ENV === "production" ? "info" : "debug",

  // Production: structured JSON
  // Development: pretty-printed
  ...(env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
            singleLine: false,
          },
        },
      }
    : {
        // Redact sensitive fields from production logs
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "*.password",
            "*.passwordHash",
            "*.accessToken",
            "*.refreshToken",
          ],
          censor: "[REDACTED]",
        },
        // ISO timestamp in production for log aggregators
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level(label) {
            return { level: label.toUpperCase() };
          },
        },
      }),
});

export type Logger = typeof logger;
