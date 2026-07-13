import { type NextFunction, type Request, type Response } from "express";

import { BadRequestError, UnauthorizedError } from "@/core/errors/HttpErrors";
import { prisma } from "@/infrastructure/database/prismaClient";
import { emitToBoardRoom } from "@/infrastructure/socket/socketServer";

import { TaskService } from "./task.service";

const taskService = new TaskService();

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await taskService.createTask(req.params.columnId!, req.user.sub, req.body);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast board update on task creation
    const col = await prisma.column.findUnique({
      where: { id: req.params.columnId! },
      select: { boardId: true },
    });
    if (col) {
      emitToBoardRoom(col.boardId, "board-updated");
    }

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
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await taskService.updateTask(req.params.id!, req.body, req.user.sub);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast board update on task modifications (title, priority, assignees, description)
    const task = await prisma.task.findUnique({
      where: { id: req.params.id! },
      include: { column: { select: { boardId: true } } },
    });
    if (task?.column) {
      emitToBoardRoom(task.column.boardId, "board-updated");
    }

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
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    // Look up board context before task is deleted
    const task = await prisma.task.findUnique({
      where: { id: req.params.id! },
      include: { column: { select: { boardId: true } } },
    });

    const result = await taskService.deleteTask(req.params.id!, req.user.sub);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast board update on task deletion
    if (task?.column) {
      emitToBoardRoom(task.column.boardId, "board-updated");
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const { taskId, columnId, position } = req.body;
    if (!taskId || !columnId || typeof position !== "number") {
      next(new BadRequestError("taskId, columnId, and numeric position are required"));
      return;
    }
    const result = await taskService.reorderTask(taskId, columnId, position, req.user.sub);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Broadcast board update on card drag-and-drops
    const col = await prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (col) {
      emitToBoardRoom(col.boardId, "board-updated");
    }

    res.status(200).json({
      success: true,
      message: "Task reordered successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function listOrgTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await taskService.getOrgTasks(req.user.sub, req.params.orgId!);
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
