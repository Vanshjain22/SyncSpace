import { type NextFunction, type Request, type Response } from "express";

import { BadRequestError, UnauthorizedError } from "@/core/errors/HttpErrors";
import { emitToTaskRoom } from "@/infrastructure/socket/socketServer";

import { CommentService } from "./comment.service";

const commentService = new CommentService();

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await commentService.getTaskComments(req.params.taskId!);
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

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const { content } = req.body;
    if (!content || typeof content !== "string") {
      next(new BadRequestError("content is required and must be a string"));
      return;
    }
    const result = await commentService.createComment(req.params.taskId!, req.user.sub, content);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast new comment to task room
    emitToTaskRoom(req.params.taskId!, "comment-created", result.value);

    res.status(201).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const isAdmin = req.userOrgRole === "OWNER" || req.userOrgRole === "ADMIN";
    const result = await commentService.deleteComment(req.params.id!, req.user.sub, isAdmin);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast deleted comment ID to task room
    emitToTaskRoom(result.value.taskId, "comment-deleted", result.value.id);

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
