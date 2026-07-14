import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import http from "http";
import path from "path";

import { env } from "@/config/env";
import { disconnectRedis } from "@/infrastructure/cache/redisClient";
import { disconnectDatabase } from "@/infrastructure/database/prismaClient";
import { logger } from "@/infrastructure/logger";
import { initSocketServer } from "@/infrastructure/socket/socketServer";
import { errorHandler } from "@/middlewares/errorHandler";
import { notFoundHandler } from "@/middlewares/notFound";
import { globalRateLimiter } from "@/middlewares/rateLimiter";
import { requestLogger } from "@/middlewares/requestLogger";
import { apiRouter } from "@/routes/index";

import "./registerAliases";

// ─── App Bootstrap ────────────────────────────────────────────────────────────

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: env.NODE_ENV === "production",
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
    exposedHeaders: ["x-request-id", "RateLimit-Limit", "RateLimit-Remaining"],
  }),
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─── Compression ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ─── Trust Proxy (for accurate IP behind reverse proxies) ────────────────────
app.set("trust proxy", 1);

// ─── Static files uploads fallback ───────────────────────────────────────────
app.use(
  "/uploads",
  express.static(path.resolve(__dirname, "../public/uploads"), {
    maxAge: "365d",
    immutable: true,
  }),
);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer(app);

// Initialize Socket.io Server
initSocketServer(server);

// ─── Server Start ─────────────────────────────────────────────────────────────
server.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      version: env.APP_VERSION,
    },
    `🚀 SyncSpace API running`,
  );
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal} — beginning graceful shutdown...`);

  server.close(async () => {
    logger.info("HTTP server closed");

    await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);

    logger.info("All connections closed — process exiting");
    process.exit(0);
  });

  // Force exit after 15 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 15_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── Unhandled Promise Rejections ─────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Promise Rejection");
  gracefulShutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception");
  gracefulShutdown("uncaughtException");
});

export { app, server };
