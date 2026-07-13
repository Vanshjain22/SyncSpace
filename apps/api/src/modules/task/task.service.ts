import { type CreateTaskInput, type UpdateTaskInput } from "@syncspace/shared";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import {
  invalidateCacheByColumnId,
  invalidateCacheByTaskId,
} from "@/infrastructure/cache/cacheInvalidation";
import { prisma } from "@/infrastructure/database/prismaClient";
import { notificationService } from "@/modules/notification/notification.service";

type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export class TaskService {
  /**
   * Create a task inside a column. Placed at the end of the column.
   */
  async createTask(columnId: string, creatorId: string, input: CreateTaskInput): AsyncResult<any> {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
    });

    if (!column) {
      return Result.err(new NotFoundError("Column"));
    }

    const board = await prisma.board.findUnique({
      where: { id: column.boardId },
      include: { project: { select: { organizationId: true, id: true } } },
    });

    if (!board) {
      return Result.err(new NotFoundError("Board"));
    }

    if (input.assigneeId) {
      const isMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: input.assigneeId,
            organizationId: board.project.organizationId,
          },
        },
      });
      if (!isMember) {
        return Result.err(
          new BadRequestError("Assignee must be a member of the workspace organization"),
        );
      }
    }

    const currentCount = await prisma.task.count({
      where: { columnId },
    });

    // Map column name dynamically to database TaskStatus enum
    let status: TaskStatus = "TODO";
    const normName = column.name.toUpperCase().replace(/\s+/g, "_");
    if (["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(normName)) {
      status = normName as TaskStatus;
    }

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assigneeId: input.assigneeId,
        labels: input.labels,
        position: currentCount,
        status,
        columnId,
        creatorId,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Trigger assignee notification if assigned to another user
    if (task.assigneeId && task.assigneeId !== creatorId) {
      await notificationService.createNotification({
        recipientId: task.assigneeId,
        type: "TASK_ASSIGNED",
        title: "Task Assigned",
        body: `You have been assigned to task: "${task.title}"`,
        triggeredBy: creatorId,
        entityId: task.id,
        entityType: "TASK",
      });
    }

    // Invalidate board cache
    await invalidateCacheByColumnId(columnId);

    if (board) {
      await prisma.activityLog.create({
        data: {
          action: "CREATED_TASK",
          entityType: "TASK",
          entityId: task.id,
          userId: creatorId,
          organizationId: board.project.organizationId,
          projectId: board.project.id,
          taskId: task.id,
          metadata: { taskTitle: task.title },
        },
      });
    }

    return Result.ok(task);
  }

  /**
   * Update task details (title, description, priority, status, tags, assignees).
   */
  async updateTask(id: string, input: UpdateTaskInput, userId: string): AsyncResult<any> {
    const prevTask = await prisma.task.findUnique({ where: { id } });
    if (!prevTask) {
      return Result.err(new NotFoundError("Task"));
    }

    // Load organization context to check assignee validity
    const board = await prisma.board.findFirst({
      where: { columns: { some: { id: prevTask.columnId } } },
      include: { project: { select: { organizationId: true, id: true } } },
    });

    if (!board) {
      return Result.err(new NotFoundError("Organization Context"));
    }

    if (input.assigneeId) {
      const isMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: input.assigneeId,
            organizationId: board.project.organizationId,
          },
        },
      });
      if (!isMember) {
        return Result.err(
          new BadRequestError("Assignee must be a member of the workspace organization"),
        );
      }
    }

    const data: any = {
      title: input.title,
      description: input.description,
      priority: input.priority,
      labels: input.labels,
      assigneeId: input.assigneeId,
    };

    if (input.dueDate !== undefined) {
      data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    if (input.status) {
      data.status = input.status;
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Trigger assignee notification if changed and assigned to another user
    if (
      updated.assigneeId &&
      updated.assigneeId !== prevTask.assigneeId &&
      updated.assigneeId !== userId
    ) {
      await notificationService.createNotification({
        recipientId: updated.assigneeId,
        type: "TASK_ASSIGNED",
        title: "Task Assigned",
        body: `You have been assigned to task: "${updated.title}"`,
        triggeredBy: userId,
        entityId: updated.id,
        entityType: "TASK",
      });
    }

    // Invalidate board cache
    await invalidateCacheByTaskId(id);

    if (board) {
      const isCompleted = updated.status === "DONE" && prevTask.status !== "DONE";
      await prisma.activityLog.create({
        data: {
          action: isCompleted ? "COMPLETED_TASK" : "UPDATED_TASK",
          entityType: "TASK",
          entityId: id,
          userId,
          organizationId: board.project.organizationId,
          projectId: board.project.id,
          taskId: id,
          metadata: { taskTitle: updated.title },
        },
      });
    }

    return Result.ok(updated);
  }

  /**
   * Delete a task.
   */
  async deleteTask(id: string, userId: string): AsyncResult<void> {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: {
                  select: { organizationId: true, id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return Result.err(new NotFoundError("Task"));
    }

    // Verify user authorization (must be a member of organization)
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: task.column.board.project.organizationId,
        },
      },
    });

    if (!orgMembership) {
      return Result.err(new ForbiddenError("Access denied"));
    }

    await prisma.$transaction(async (tx) => {
      // Create activity log entry inside transaction before deletion
      await tx.activityLog.create({
        data: {
          action: "DELETED_TASK",
          entityType: "TASK",
          entityId: id,
          userId,
          organizationId: task.column.board.project.organizationId,
          projectId: task.column.board.project.id,
          taskId: id,
          metadata: { taskTitle: task.title },
        },
      });

      // 1. Delete task
      await tx.task.delete({ where: { id } });

      // 2. Re-index sibling tasks in the column to avoid positional gaps
      const remainingTasks = await tx.task.findMany({
        where: { columnId: task.columnId },
        orderBy: { position: "asc" },
      });

      for (let index = 0; index < remainingTasks.length; index++) {
        const item = remainingTasks[index];
        if (item) {
          await tx.task.update({
            where: { id: item.id },
            data: { position: index },
          });
        }
      }
    });

    // Invalidate board cache
    await invalidateCacheByColumnId(task.columnId);

    return Result.ok(undefined);
  }

  /**
   * Reorder a task's position inside its column or move it between columns.
   */
  async reorderTask(
    taskId: string,
    targetColumnId: string,
    newPosition: number,
    userId: string,
  ): AsyncResult<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: {
                  select: { organizationId: true, id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return Result.err(new NotFoundError("Task"));
    }

    // Verify user authorization (must be a member of organization)
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: task.column.board.project.organizationId,
        },
      },
    });

    if (!orgMembership) {
      return Result.err(new ForbiddenError("Access denied"));
    }

    const targetColumn = await prisma.column.findUnique({
      where: { id: targetColumnId },
    });

    if (!targetColumn) {
      return Result.err(new NotFoundError("Target Column"));
    }

    const sourceColumnId = task.columnId;
    const oldPosition = task.position;

    // Resolve new status based on target column name
    let newStatus = task.status;
    const normName = targetColumn.name.toUpperCase().replace(/\s+/g, "_");
    if (["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(normName)) {
      newStatus = normName as any;
    }

    await prisma.$transaction(async (tx) => {
      // Create activity log inside transaction
      await tx.activityLog.create({
        data: {
          action: sourceColumnId === targetColumnId ? "UPDATED_TASK" : "MOVED_TASK",
          entityType: "TASK",
          entityId: taskId,
          userId,
          organizationId: task.column.board.project.organizationId,
          projectId: task.column.board.project.id,
          taskId,
          metadata: {
            taskTitle: task.title,
            fromColumnId: sourceColumnId,
            toColumnId: targetColumnId,
          },
        },
      });

      if (sourceColumnId === targetColumnId) {
        // Moving within the same column
        if (oldPosition === newPosition) {
          return;
        }

        if (oldPosition < newPosition) {
          // Shift elements in between up
          await tx.task.updateMany({
            where: {
              columnId: sourceColumnId,
              position: { gt: oldPosition, lte: newPosition },
            },
            data: { position: { decrement: 1 } },
          });
        } else {
          // Shift elements in between down
          await tx.task.updateMany({
            where: {
              columnId: sourceColumnId,
              position: { gte: newPosition, lt: oldPosition },
            },
            data: { position: { increment: 1 } },
          });
        }

        // Update task position
        await tx.task.update({
          where: { id: taskId },
          data: { position: newPosition },
        });
      } else {
        // Moving to a different column
        // 1. Shift tasks in source column down
        await tx.task.updateMany({
          where: {
            columnId: sourceColumnId,
            position: { gt: oldPosition },
          },
          data: { position: { decrement: 1 } },
        });

        // 2. Shift tasks in target column up
        await tx.task.updateMany({
          where: {
            columnId: targetColumnId,
            position: { gte: newPosition },
          },
          data: { position: { increment: 1 } },
        });

        // 3. Update task
        await tx.task.update({
          where: { id: taskId },
          data: {
            columnId: targetColumnId,
            position: newPosition,
            status: newStatus,
          },
        });
      }
    });

    // Invalidate board cache for both original and target columns
    await Promise.all([
      invalidateCacheByColumnId(task.columnId),
      invalidateCacheByColumnId(targetColumnId),
    ]);

    return Result.ok(undefined);
  }

  /**
   * List all tasks in an organization.
   */
  async getOrgTasks(userId: string, orgId: string): AsyncResult<any[]> {
    // 1. Verify user membership in organization
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    if (!orgMembership) {
      return Result.err(new ForbiddenError("You are not a member of this organization"));
    }

    // 2. Fetch all projects in organization that user has access to
    const isAdminOrOwner = orgMembership.role === "OWNER" || orgMembership.role === "ADMIN";

    let projects;
    if (isAdminOrOwner) {
      projects = await prisma.project.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      });
    } else {
      projects = await prisma.project.findMany({
        where: {
          organizationId: orgId,
          members: { some: { userId } },
        },
        select: { id: true, name: true },
      });
    }

    const projectIds = projects.map((p) => p.id);

    // 3. Query all tasks inside these projects
    const tasks = await prisma.task.findMany({
      where: {
        column: {
          board: {
            projectId: { in: projectIds },
          },
        },
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        creator: {
          select: { id: true, name: true },
        },
        column: {
          select: {
            name: true,
            board: {
              select: {
                project: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format the tasks with project details for convenience
    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      assignee: task.assignee,
      creator: task.creator,
      projectName: task.column.board.project.name,
      projectId: task.column.board.project.id,
      columnName: task.column.name,
    }));

    return Result.ok(formattedTasks);
  }
}
