import { type NextFunction, type Request, type Response } from "express";

import { UnauthorizedError } from "@/core/errors/HttpErrors";

import { AIService } from "./ai.service";

const aiService = new AIService();

/**
 * Endpoint to generate a Markdown project report using Gemini
 */
export async function generateReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const { projectId } = req.params;
    if (!projectId) {
      res.status(400).json({ success: false, error: "Project ID is required" });
      return;
    }

    const result = await aiService.generateProjectReport(req.user.sub, projectId);

    if (result.isErr()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        reportText: result.value,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint to chat with the AI project assistant
 */
export async function askAssistant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const { projectId, query } = req.body;
    if (!projectId || !query) {
      res.status(400).json({
        success: false,
        error: "Both projectId and query are required in the request body",
      });
      return;
    }

    const result = await aiService.askAssistant(req.user.sub, projectId, query);

    if (result.isErr()) {
      next(result.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        responseText: result.value,
      },
    });
  } catch (error) {
    next(error);
  }
}
