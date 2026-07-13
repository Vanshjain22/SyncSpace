import { type NextFunction, type Request, type Response } from "express";

import { BadRequestError, UnauthorizedError } from "@/core/errors/HttpErrors";
import { emitToBoardRoom } from "@/infrastructure/socket/socketServer";

import { ColumnService } from "./column.service";

const columnService = new ColumnService();

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await columnService.createColumn(req.params.boardId!, req.body);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast column addition to board room
    emitToBoardRoom(req.params.boardId!, "board-updated");

    res.status(201).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await columnService.updateColumn(req.params.id!, req.body);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast column rename/theme modification to board room
    emitToBoardRoom(result.value.boardId, "board-updated");

    res.status(200).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await columnService.deleteColumn(req.params.id!);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast column deletion to board room
    emitToBoardRoom(result.value.boardId, "board-updated");

    res.status(200).json({
      success: true,
      message: "Column deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { columnIds } = req.body;
    if (!Array.isArray(columnIds)) {
      next(new BadRequestError("columnIds must be an array of strings"));
      return;
    }
    const result = await columnService.reorderColumns(req.params.boardId!, columnIds);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast column reordering to board room
    emitToBoardRoom(req.params.boardId!, "board-updated");

    res.status(200).json({
      success: true,
      message: "Columns reordered successfully",
    });
  } catch (error) {
    next(error);
  }
}
