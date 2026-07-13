import { NotFoundError } from "@/core/errors/HttpErrors";
import { Result, type AsyncResult } from "@/core/result/Result";
import { cacheService } from "@/infrastructure/cache/cacheService";
import { prisma } from "@/infrastructure/database/prismaClient";

export class AnalyticsService {
  /**
   * Get task status and priority distributions for a project.
   */
  async getProjectAnalytics(projectId: string): AsyncResult<any> {
    const cacheKey = `project:${projectId}:analytics`;
    const cachedData = await cacheService.get<any>(cacheKey);
    if (cachedData) {
      return Result.ok(cachedData);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return Result.err(new NotFoundError("Project"));
    }

    const board = await prisma.board.findFirst({
      where: { projectId },
      include: { columns: true },
    });
    if (!board) {
      return Result.err(new NotFoundError("Kanban Board"));
    }

    const columnIds = board.columns.map((c) => c.id);

    // Group tasks by status
    const statusGroups = await prisma.task.groupBy({
      by: ["status"],
      where: { columnId: { in: columnIds } },
      _count: true,
    });

    // Group tasks by priority
    const priorityGroups = await prisma.task.groupBy({
      by: ["priority"],
      where: { columnId: { in: columnIds } },
      _count: true,
    });

    const statusCounts = {
      BACKLOG: 0,
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };
    statusGroups.forEach((g) => {
      (statusCounts as any)[g.status] = g._count;
    });

    const priorityCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };
    priorityGroups.forEach((g) => {
      (priorityCounts as any)[g.priority] = g._count;
    });

    const totalTasks = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const completedTasks = statusCounts.DONE;
    const openTasks = totalTasks - completedTasks;

    const result = {
      projectName: project.name,
      statusCounts,
      priorityCounts,
      totalTasks,
      completedTasks,
      openTasks,
    };

    // Save cache in Redis
    await cacheService.set(cacheKey, result);

    return Result.ok(result);
  }

  /**
   * Get organization dashboard stats, including total projects, completed tasks,
   * active team members, productivity score, recent activities, and upcoming deadlines.
   */
  async getOrgDashboardStats(orgId: string): AsyncResult<any> {
    const teamMembersCount = await prisma.organizationMember.count({
      where: { organizationId: orgId },
    });

    const projects = await prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, createdAt: true },
    });
    const projectIds = projects.map((p) => p.id);

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

    const totalTasks = await prisma.task.count({
      where: { columnId: { in: columnIds } },
    });
    const completedTasks = await prisma.task.count({
      where: { columnId: { in: columnIds }, status: "DONE" },
    });

    const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        columnId: { in: columnIds },
        dueDate: { not: null },
      },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    const recentProjects = await prisma.project.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentTasks = await prisma.task.findMany({
      where: { columnId: { in: columnIds } },
      include: {
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentComments = await prisma.comment.findMany({
      where: { task: { columnId: { in: columnIds } } },
      include: {
        author: { select: { name: true } },
        task: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const activities = [
      ...recentProjects.map((p) => ({
        id: `proj-${p.id}`,
        type: "tasks" as const,
        user: "System",
        action: "created project",
        target: p.name,
        timestamp: p.createdAt.getTime(),
      })),
      ...recentTasks.map((t) => ({
        id: `task-${t.id}`,
        type: "tasks" as const,
        user: t.creator.name,
        action: t.status === "DONE" ? "completed task" : "created task",
        target: t.title,
        timestamp: t.createdAt.getTime(),
      })),
      ...recentComments.map((c) => ({
        id: `comm-${c.id}`,
        type: "comments" as const,
        user: c.author.name,
        action: "commented on",
        target: c.task.title,
        timestamp: c.createdAt.getTime(),
      })),
    ];

    activities.sort((a, b) => b.timestamp - a.timestamp);

    const result = {
      teamMembersCount,
      completedTasks,
      totalTasks,
      productivityScore,
      upcomingDeadlines: upcomingDeadlines.map((t) => ({
        id: t.id,
        title: t.title,
        project: t.column.board.project.name,
        dueDate: t.dueDate,
        status: t.status,
      })),
      activities: activities.slice(0, 10),
    };

    return Result.ok(result);
  }
}
