import { type Notification, type NotificationType } from "@prisma/client";

import { ForbiddenError, NotFoundError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import { prisma } from "@/infrastructure/database/prismaClient";
import { emitToUser } from "@/infrastructure/socket/socketServer";

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  triggeredBy?: string;
  entityId?: string;
  entityType?: string;
}

export class NotificationService {
  /**
   * Get recent notifications for a user.
   */
  async getUserNotifications(userId: string): AsyncResult<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        trigger: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      take: 50,
    });
    return Result.ok(notifications);
  }

  /**
   * Create a notification record and push it to the user in real-time.
   */
  async createNotification(input: CreateNotificationInput): AsyncResult<Notification> {
    const notification = await prisma.notification.create({
      data: {
        type: input.type,
        title: input.title,
        body: input.body,
        recipientId: input.recipientId,
        triggeredBy: input.triggeredBy || null,
        entityId: input.entityId || null,
        entityType: input.entityType || null,
      },
      include: {
        trigger: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Push via Socket.io
    emitToUser(input.recipientId, "notification-received", notification);

    return Result.ok(notification);
  }

  /**
   * Mark a specific notification as read.
   */
  async markAsRead(id: string, userId: string): AsyncResult<Notification> {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return Result.err(new NotFoundError("Notification"));
    }

    if (notification.recipientId !== userId) {
      return Result.err(
        new ForbiddenError("You do not have permission to modify this notification"),
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return Result.ok(updated);
  }

  /**
   * Mark all unread notifications of a user as read.
   */
  async markAllAsRead(userId: string): AsyncResult<void> {
    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    return Result.ok(undefined);
  }
}
export const notificationService = new NotificationService();
