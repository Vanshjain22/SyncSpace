/**
 * Express Request type augmentation.
 *
 * Extends the Express Request interface to add the `user` property
 * that is attached by the `authenticate` middleware after JWT verification.
 *
 * This file is picked up automatically by TypeScript due to the
 * `include: ["src"]` directive in tsconfig.json.
 */
import "express";
import "express";

declare global {
  namespace Express {
    interface Request {
      /**
       * Decoded JWT access token payload.
       * Present only on routes protected by the `authenticate` middleware.
       */
      user?: {
        /** The authenticated user's database ID. */
        sub: string;
        /** Token type guard — always "access" for access tokens. */
        type: "access";
        iat?: number;
        exp?: number;
      };
      /** The active user's role in the current organization context. */
      userOrgRole?: "OWNER" | "ADMIN" | "MEMBER";
    }
  }
}
