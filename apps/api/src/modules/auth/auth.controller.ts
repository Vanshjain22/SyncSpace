import { JWT } from "@syncspace/shared";
import { type NextFunction, type Request, type Response, type CookieOptions } from "express";

import { AuthService } from "./auth.service";

import { env } from "@/config/env";
import { UnauthorizedError } from "@/core/errors/HttpErrors";

const authService = new AuthService();

const COOKIE_NAME = "syncspace_refresh_token";

const getCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: JWT.REFRESH_TOKEN_EXPIRES_MS,
  path: "/",
});

/**
 * Express controllers for auth endpoints.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    const { user, accessToken, refreshToken } = result.value;

    res.cookie(COOKIE_NAME, refreshToken, getCookieOptions());

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    const { user, accessToken, refreshToken } = result.value;

    res.cookie(COOKIE_NAME, refreshToken, getCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies[COOKIE_NAME] as string | undefined;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    const clearCookieOptions = getCookieOptions();
    // delete maxAge so it expires immediately
    delete clearCookieOptions.maxAge;

    res.clearCookie(COOKIE_NAME, clearCookieOptions);

    res.status(200).json({
      success: true,
      data: {
        message: "Logged out successfully",
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies[COOKIE_NAME] as string | undefined;

    if (!token) {
      next(new UnauthorizedError("Refresh token missing — please sign in again"));
      return;
    }

    const result = await authService.refreshTokens(token);
    if (result.isErr()) {
      // Clear cookie if the token was invalid or expired
      const clearCookieOptions = getCookieOptions();
      delete clearCookieOptions.maxAge;
      res.clearCookie(COOKIE_NAME, clearCookieOptions);
      next(result.error);
      return;
    }

    const { accessToken, refreshToken } = result.value;

    res.cookie(COOKIE_NAME, refreshToken, getCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError("Authentication is required"));
      return;
    }

    const result = await authService.getMe(req.user.sub);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: result.value,
      },
    });
  } catch (error) {
    next(error);
  }
}
