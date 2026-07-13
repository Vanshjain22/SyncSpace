import { ForbiddenError, NotFoundError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import { invalidateCacheByTaskId } from "@/infrastructure/cache/cacheInvalidation";
import { prisma } from "@/infrastructure/database/prismaClient";
import { notificationService } from "@/modules/notification/notification.service";

export class CommentService {
  /**
   * List all comments on a specific task.
   */
  async getTaskComments(taskId: string): AsyncResult<any[]> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return Result.err(new NotFoundError("Task"));
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return Result.ok(comments);
  }

  /**
   * Post a new comment to a task.
   */
  async createComment(taskId: string, authorId: string, content: string): AsyncResult<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, assigneeId: true },
    });
    if (!task) {
      return Result.err(new NotFoundError("Task"));
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        authorId,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Trigger notification if task is assigned and commenter is not the assignee
    if (task.assigneeId && task.assigneeId !== authorId) {
      await notificationService.createNotification({
        recipientId: task.assigneeId,
        type: "TASK_COMMENTED",
        title: "New Comment",
        body: `${comment.author.name} commented on task: "${task.title}"`,
        triggeredBy: authorId,
        entityId: task.id,
        entityType: "TASK",
      });
    }

    // Invalidate board cache (comment counts have changed!)
    await invalidateCacheByTaskId(taskId);

    // Create ActivityLog entry for commenting on task
    const taskDetails = await prisma.task.findUnique({
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

    if (taskDetails) {
      await prisma.activityLog.create({
        data: {
          action: "COMMENTED_TASK",
          entityType: "TASK",
          entityId: taskId,
          userId: authorId,
          organizationId: taskDetails.column.board.project.organizationId,
          projectId: taskDetails.column.board.project.id,
          taskId: taskId,
          metadata: { taskTitle: taskDetails.title, commentContent: content },
        },
      });
    }

    return Result.ok(comment);
  }

  /**
   * Delete a task comment. Restrict to author or workspace admin/owners.
   */
  async deleteComment(id: string, userId: string, isAdmin: boolean): AsyncResult<any> {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      return Result.err(new NotFoundError("Comment"));
    }

    // Authorization: User must be either the author of the comment or an administrator/owner in organization
    if (comment.authorId !== userId && !isAdmin) {
      return Result.err(new ForbiddenError("You do not have permission to delete this comment"));
    }

    const deletedComment = await prisma.comment.delete({ where: { id } });

    // Invalidate board cache (comment counts have changed!)
    await invalidateCacheByTaskId(comment.taskId);

    return Result.ok(deletedComment);
  }
}
