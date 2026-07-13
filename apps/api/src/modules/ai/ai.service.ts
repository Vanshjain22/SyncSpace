import { GoogleGenAI } from "@google/genai";

import { env } from "@/config/env";
import { ForbiddenError, NotFoundError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import { prisma } from "@/infrastructure/database/prismaClient";

export class AIService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  /**
   * Verify if a user belongs to a project
   */
  private async checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
    const member = await prisma.projectMember.findFirst({
      where: {
        userId,
        projectId,
      },
    });
    return !!member;
  }

  /**
   * Generate an AI-driven project status report
   */
  async generateProjectReport(userId: string, projectId: string): AsyncResult<string> {
    // 1. Authorization Check
    const hasAccess = await this.checkProjectAccess(userId, projectId);
    if (!hasAccess) {
      return Result.err(new ForbiddenError("You do not have permission to access this project"));
    }

    // 2. Fetch Project Context
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        boards: {
          include: {
            columns: {
              include: {
                tasks: {
                  include: {
                    assignee: {
                      select: { id: true, name: true, email: true },
                    },
                    creator: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!project) {
      return Result.err(new NotFoundError("Project"));
    }

    // 3. Fetch Recent Activities (last 50 events)
    const activities = await prisma.activityLog.findMany({
      where: { projectId },
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    // 4. Aggregate metrics for AI prompt
    const columnsData = project.boards[0]?.columns ?? [];
    const tasks = columnsData.flatMap((c) => c.tasks);
    const completedTasksCount = tasks.filter((t) => t.status === "DONE").length;
    const pendingTasksCount = tasks.filter((t) => t.status !== "DONE").length;
    const overdueTasksCount = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE",
    ).length;

    const taskSummary = tasks.map((t) => ({
      title: t.title,
      description: t.description ?? "No description",
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.name ?? "Unassigned",
      dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No due date",
    }));

    const recentLogs = activities.map((a) => ({
      user: a.user.name,
      action: a.action,
      entityType: a.entityType,
      createdAt: a.createdAt.toLocaleDateString(),
    }));

    // 5. Construct AI prompt
    const promptText = `
You are an expert AI Project Manager and business analyst at SyncSpace, an enterprise project management platform.
Your task is to generate a comprehensive, highly professional, and visually stunning project status report based on the provided project, task, and activity context.

Project Details:
- Name: "${project.name}"
- Description: "${project.description ?? "No description provided."}"
- Members count: ${project.members.length}

Key Metrics:
- Total Tasks: ${tasks.length}
- Completed Tasks: ${completedTasksCount}
- Pending/Active Tasks: ${pendingTasksCount}
- Overdue Tasks: ${overdueTasksCount}

Task Details:
${JSON.stringify(taskSummary, null, 2)}

Recent Activities (last 50 logs, newer first):
${JSON.stringify(recentLogs, null, 2)}

Requirements for the report:
1. Format your response strictly in Markdown. Use clean headings, tables, bullet points, and highlight sections (e.g. bold, blockquotes) for visual appeal.
2. Structure the report as follows:
   - **Executive Summary**: A summary of the project's health (On Track, At Risk, Behind) based on pending/overdue tasks.
   - **Task Status Overview**: Table formatting showing Task count by Columns/Statuses.
   - **Critical Path / Overdue Items**: Explicit list of overdue tasks or high/urgent priority tasks that need immediate focus, along with their assignees.
   - **Recent Activity Breakdown**: Brief summary of what actions have been taken recently by who.
   - **Strategic Recommendations**: 3-4 professional recommendations to help project coordinators unblock progress, optimize workflows, or realign deadlines.
3. Be professional, supportive, objective, and action-oriented. Do not mention system-level JSON details; speak as if you are analyzing the project directly.
`;

    // 6. Generate content via Gemini
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptText,
      });

      const reportText = response.text;
      if (!reportText) {
        throw new Error("Gemini returned empty text.");
      }

      return Result.ok(reportText);
    } catch (error: any) {
      return Result.err(new Error(`Failed to generate AI report: ${error.message}`));
    }
  }

  /**
   * Ask the AI Assistant a question about the project
   */
  async askAssistant(userId: string, projectId: string, query: string): AsyncResult<string> {
    const hasAccess = await this.checkProjectAccess(userId, projectId);
    if (!hasAccess) {
      return Result.err(new ForbiddenError("You do not have permission to access this project"));
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        boards: {
          include: {
            columns: {
              include: {
                tasks: {
                  include: {
                    assignee: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return Result.err(new NotFoundError("Project"));
    }

    const tasks = project.boards[0]?.columns.flatMap((c) => c.tasks) ?? [];
    const taskContext = tasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.name ?? "Unassigned",
      dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No due date",
    }));

    const promptText = `
You are the SyncSpace AI Assistant, integrated directly inside a team project dashboard.
You are assisting a user in managing the project "${project.name}".
Below is the current list of tasks in the project:
${JSON.stringify(taskContext, null, 2)}

The user asks: "${query}"

Guidelines for your response:
1. Keep your answers concise, clear, and context-aware.
2. Directly answer the user's question referencing specific tasks, assignees, and statuses from the context.
3. If they ask for recommendations or summaries, structure them with bullet points.
4. Format your answer in neat Markdown.
5. If the question is unrelated to the project, politely guide the conversation back to the project workspace.
`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptText,
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gemini returned empty response.");
      }

      return Result.ok(responseText);
    } catch (error: any) {
      return Result.err(new Error(`Failed to generate response: ${error.message}`));
    }
  }
}
