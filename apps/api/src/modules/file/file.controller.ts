import { type NextFunction, type Request, type Response } from "express";

import { BadRequestError, UnauthorizedError } from "@/core/errors/HttpErrors";

import { FileService } from "./file.service";

const fileService = new FileService();

export async function upload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!req.file) {
      next(new BadRequestError("No file was uploaded"));
      return;
    }
    const result = await fileService.createTaskAttachment(
      req.params.taskId!,
      req.user.sub,
      req.file,
    );
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(201).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await fileService.getTaskAttachments(req.params.taskId!);
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

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const isAdmin = req.userOrgRole === "OWNER" || req.userOrgRole === "ADMIN";
    const result = await fileService.deleteAttachment(req.params.id!, req.user.sub, isAdmin);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
