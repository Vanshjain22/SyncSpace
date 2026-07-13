import { type NextFunction, type Request, type Response } from "express";

import { UnauthorizedError } from "@/core/errors/HttpErrors";

import { ProjectService } from "./project.service";

const projectService = new ProjectService();

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await projectService.createProject(req.user.sub, req.params.orgId!, req.body);
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

export async function listOrgProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await projectService.getOrgProjects(req.user.sub, req.params.orgId!);
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

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await projectService.getProjectById(req.user.sub, req.params.id!);
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

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await projectService.updateProject(req.user.sub, req.params.id!, req.body);
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
    const result = await projectService.deleteProject(req.user.sub, req.params.id!);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
