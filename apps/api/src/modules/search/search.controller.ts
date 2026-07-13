import { type NextFunction, type Request, type Response } from "express";

import { BadRequestError, UnauthorizedError } from "@/core/errors/HttpErrors";

import { SearchService } from "./search.service";

const searchService = new SearchService();

export async function searchTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const q = req.query.q;
    if (typeof q !== "string") {
      next(new BadRequestError("Search query parameter 'q' must be a string"));
      return;
    }
    const result = await searchService.searchWorkspaceTasks(req.params.orgId!, q);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}
