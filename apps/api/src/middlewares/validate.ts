import { type NextFunction, type Request, type Response } from "express";
import { type AnyZodObject } from "zod";

/**
 * Middleware factory to validate request parts using Zod schemas.
 * Throws ZodError on failure, which is caught and formatted by global errorHandler.
 */
export function validate(schemas: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
