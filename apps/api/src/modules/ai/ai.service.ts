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

  /**
   * Generate real-time AI sprint diagnostics for the organization dashboard
   */
  async generateDashboardInsights(userId: string, orgId: string): AsyncResult<any> {
    // 1. Authorization check: does user belong to this organization?
    const membership = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
    });
    if (!membership) {
      return Result.err(new ForbiddenError("You do not have access to this organization"));
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      return Result.err(new NotFoundError("Organization"));
    }

    // 2. Fetch all projects in organization
    const projects = await prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });
    const projectIds = projects.map((p) => p.id);

    // 3. Fetch all tasks in these projects
    const boards = await prisma.board.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true },
    });
    const boardIds = boards.map((b) => b.id);

    const columns = await prisma.column.findMany({
      where: { boardId: { in: boardIds } },
      select: { id: true },
    });
    const columnIds = columns.map((c) => c.id);

    const tasks = await prisma.task.findMany({
      where: { columnId: { in: columnIds } },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const productivityScore =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    // Detect overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now,
    );
    overdueTasks.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    // Detect tasks in review
    const reviewTasks = tasks.filter((t) => t.status === "IN_REVIEW");

    // Detect oldest overdue task and guard access
    const oldestOverdue = overdueTasks.length > 0 && overdueTasks[0] ? overdueTasks[0] : null;

    // Build context prompt
    const promptText = `
You are SyncSpace Autopilot, an intelligent PM assistant.
Provide a list of exactly 3 to 4 concise status bullet lines summarizing the current sprint health, velocity, blockages, and recommendations.
Do NOT output a general greeting (like "Hey Vansh" or "Good Morning") in the text. Output ONLY the status bullet lines.

Workspace metrics to reference dynamically:
- Total members: ${members.length}
- Total projects: ${projects.length}
- Total tasks: ${totalTasks}
- Completed tasks: ${completedTasks}
- Productivity score: ${productivityScore}%
- Overdue tasks count: ${overdueTasks.length}
${oldestOverdue ? `- Oldest overdue task detail: "${oldestOverdue.title}" assigned to ${oldestOverdue.assignee?.name || "Unassigned"}` : ""}
- Tasks in review count: ${reviewTasks.length}

Format guidelines:
1. Return exactly 3 to 4 lines, each starting with a bullet character "• ".
2. DO NOT use markdown formatting (no bold **, no headers). Keep the text plain.
3. Keep each line under 80 characters.
`;

    let insightsBullets = [
      `Workspace metrics are optimal with ${completedTasks} completed out of ${totalTasks} tasks.`,
      `Overall productivity score is currently at ${productivityScore}%.`,
      overdueTasks.length > 0
        ? `${oldestOverdue?.assignee?.name || "Unassigned"} has ${overdueTasks.length} overdue task(s), including "${oldestOverdue?.title}".`
        : "All active tasks are currently matching their target deadlines.",
    ];

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptText,
      });

      if (response.text) {
        const lines = response.text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => {
            if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
              return line.substring(1).trim();
            }
            return line;
          });
        if (lines.length > 0) {
          insightsBullets = lines;
        }
      }
    } catch (err) {
      console.error("Failed to generate AI welcome insights:", err);
    }

    const insightsText = insightsBullets.join("\n");

    // Determine Dynamic actions
    const actions = [];

    // Action 1: Ping overdue user
    if (oldestOverdue && oldestOverdue.assignee) {
      actions.push({
        type: "PING_USER",
        label: `⚡ Ping ${oldestOverdue.assignee.name.split(" ")[0]}`,
        payload: {
          userId: oldestOverdue.assignee.id,
          userName: oldestOverdue.assignee.name,
          taskId: oldestOverdue.id,
          taskTitle: oldestOverdue.title,
        },
      });
    }

    // Action 2: Go to AI Report page for first project
    if (projects.length > 0 && projects[0]) {
      const firstProject = projects[0];
      actions.push({
        type: "GENERATE_REPORT",
        label: "📊 Generate Sprint Summary",
        payload: {
          projectId: firstProject.id,
          projectName: firstProject.name,
        },
      });
    }

    // Action 3: View Blocked/Urgent tasks filter
    const highPriorityTasks = tasks.filter(
      (t) => t.status !== "DONE" && (t.priority === "URGENT" || t.priority === "HIGH"),
    );
    if (highPriorityTasks.length > 0 || overdueTasks.length > 0) {
      const blockedTaskIds = Array.from(
        new Set([...overdueTasks.map((t) => t.id), ...highPriorityTasks.map((t) => t.id)]),
      );

      actions.push({
        type: "FILTER_BLOCKED",
        label: "🔍 View Blockers",
        payload: {
          taskIds: blockedTaskIds,
        },
      });
    }

    // Action 4: Ask AI conversational assistant
    actions.push({
      type: "ASK_AI",
      label: "✨ Ask AI",
      payload: {},
    });

    return Result.ok({
      insightsText,
      insightsBullets,
      actions,
      metrics: {
        totalProjects: projects.length,
        completedTasks,
        totalTasks,
        productivityScore,
        teamMembersCount: members.length,
        pendingReviewsCount: reviewTasks.length,
        overdueTasksCount: overdueTasks.length,
      },
    });
  }
}
