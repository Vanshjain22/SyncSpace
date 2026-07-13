import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";

import { UnauthorizedError } from "@/core/errors/HttpErrors";
import { verifyAccessToken } from "@/lib/jwt";

/**
 * Authentication middleware.
 *
 * Extracts the Bearer token from the `Authorization` header, verifies the JWT
 * signature and expiry, then attaches the decoded payload to `req.user`.
 *
 * Throws UnauthorizedError (→ 401) if:
 * - `Authorization` header is missing or not in `Bearer <token>` format
 * - Token is expired
 * - Token signature is invalid or the token is malformed
 *
 * Usage:
 *   router.get("/profile", authenticate, myHandler)
 *   router.use(authenticate)  // Protect an entire router
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Missing or malformed Authorization header — expected: Bearer <token>"));
    return;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    next(new UnauthorizedError("Access token must not be empty"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError("Access token has expired — please refresh your session"));
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid access token"));
      return;
    }

    next(err);
  }
}
