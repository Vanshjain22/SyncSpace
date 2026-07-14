import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

import { redis } from "@/infrastructure/cache/redisClient";
import { RATE_LIMIT } from "@syncspace/shared";

/**
 * Global rate limiter — applied to all routes.
 * Stricter auth-specific limiter defined separately in the auth module.
 */
export const globalRateLimiter = rateLimit({
  windowMs: RATE_LIMIT.GLOBAL_WINDOW_MS,
  max: RATE_LIMIT.GLOBAL_MAX_REQUESTS,
  standardHeaders: "draft-7", // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  store: new RedisStore({
    // @ts-expect-error - sendCommand signature compatibility
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)),
    prefix: "rate-limit:global:",
  }),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests — please slow down and try again later",
      },
      statusCode: 429,
    });
  },
  // Skip rate limiting for health checks and development environments
  skip: (req) => process.env.NODE_ENV === "development" || req.path === "/api/health",
});

/**
 * Strict rate limiter for authentication endpoints.
 * Prevents brute-force attacks on login/register.
 */
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  max: RATE_LIMIT.AUTH_MAX_REQUESTS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - sendCommand signature compatibility
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)),
    prefix: "rate-limit:auth:",
  }),
  keyGenerator: (req) => {
    // Rate limit by IP + email to be more precise
    const email = (req.body as { email?: string })?.email ?? "";
    return `${req.ip}-${email}`;
  },
  skip: () => process.env.NODE_ENV === "development",
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many authentication attempts. Please wait 15 minutes before trying again.",
      },
      statusCode: 429,
    });
  },
});
