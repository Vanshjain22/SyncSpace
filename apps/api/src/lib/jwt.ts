import jwt from "jsonwebtoken";

import { env } from "@/config/env";

// ─── Payload Types ─────────────────────────────────────────────────────────────

export interface JwtAccessPayload {
  /** Authenticated user's ID */
  sub: string;
  type: "access";
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  /** Authenticated user's ID */
  sub: string;
  type: "refresh";
  iat?: number;
  exp?: number;
}

// ─── Token Signing ─────────────────────────────────────────────────────────────

/**
 * Signs a short-lived access token (default 15 min).
 * Transported in the Authorization header as Bearer token.
 */
export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
}

/**
 * Signs a long-lived refresh token (default 7 days).
 * Stored in an httpOnly cookie and persisted in the database.
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
}

// ─── Token Verification ────────────────────────────────────────────────────────

/**
 * Verifies an access token and returns the decoded payload.
 * Throws jsonwebtoken errors on invalid/expired tokens.
 */
export function verifyAccessToken(token: string): JwtAccessPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (typeof payload === "string") {
    throw new jwt.JsonWebTokenError("Malformed token — expected object payload");
  }

  if ((payload as JwtAccessPayload).type !== "access") {
    throw new jwt.JsonWebTokenError("Invalid token type — expected access token");
  }

  return payload as JwtAccessPayload;
}

/**
 * Verifies a refresh token and returns the decoded payload.
 * Throws jsonwebtoken errors on invalid/expired tokens.
 */
export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (typeof payload === "string") {
    throw new jwt.JsonWebTokenError("Malformed token — expected object payload");
  }

  if ((payload as JwtRefreshPayload).type !== "refresh") {
    throw new jwt.JsonWebTokenError("Invalid token type — expected refresh token");
  }

  return payload as JwtRefreshPayload;
}
