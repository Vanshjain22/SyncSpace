import path from "path";

import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Environment variable validation schema.
 *
 * This runs at application startup. If any required variable is missing
 * or invalid, the process will exit immediately with a descriptive error.
 *
 * This is preferable to silent runtime failures deep in the application.
 */
const envSchema = z.object({
  // ─── Server ────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_VERSION: z.string().default("v1"),
  APP_VERSION: z.string().default("0.1.0"),

  // ─── Database ──────────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .url()
    .startsWith("postgresql://", "DATABASE_URL must be a valid PostgreSQL connection string"),

  // ─── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: z
    .string()
    .url()
    .startsWith("redis://", "REDIS_URL must be a valid Redis connection string"),

  // ─── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters for security"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters for security"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // ─── CORS ──────────────────────────────────────────────────────────────────
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  // ─── Cloudinary (optional until Phase 6) ───────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // ─── AWS S3 (optional) ─────────────────────────────────────────────────────
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `  • ${field}: ${msgs?.join(", ")}`)
      .join("\n");

    console.error(
      `\n❌ Invalid environment variables:\n${messages}\n\n` +
        `Copy apps/api/.env.example to apps/api/.env and fill in the required values.\n`,
    );
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();

// Type-safe env export — use this throughout the app instead of process.env
export type { Env };
