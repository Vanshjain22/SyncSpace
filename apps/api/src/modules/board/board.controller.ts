import { type NextFunction, type Request, type Response } from "express";

import { UnauthorizedError } from "@/core/errors/HttpErrors";

import { BoardService } from "./board.service";

const boardService = new BoardService();

export async function getBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await boardService.getProjectBoardWithTasks(req.params.projectId!);
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
