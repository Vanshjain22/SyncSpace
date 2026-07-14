import { type NextFunction, type Request, type Response } from "express";

import { UnauthorizedError } from "@/core/errors/HttpErrors";

import { AnalyticsService } from "./analytics.service";

const analyticsService = new AnalyticsService();

export async function getProjectMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await analyticsService.getProjectAnalytics(req.params.projectId!);
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

export async function getOrgDashboardMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await analyticsService.getOrgDashboardStats(req.params.orgId!);
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
