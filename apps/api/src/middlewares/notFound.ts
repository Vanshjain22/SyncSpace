import { type NextFunction, type Request, type Response } from "express";

/**
 * 404 catch-all middleware.
 *
 * Mounted after all route definitions. If a request reaches this middleware,
 * no route matched — respond with a structured 404.
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
    statusCode: 404,
  });
}
