import { ForbiddenError, NotFoundError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import { prisma } from "@/infrastructure/database/prismaClient";
import { storageProvider } from "@/infrastructure/storage/StorageProvider";

export class FileService {
  /**
   * Upload and attach a file to a specific task.
   */
  async createTaskAttachment(
    taskId: string,
    uploaderId: string,
    file: Express.Multer.File,
  ): AsyncResult<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!task) {
      return Result.err(new NotFoundError("Task"));
    }

    const projectId = task.column.board.projectId;

    // Upload using StorageProvider (handles Cloudinary / Local fallbacks)
    const uploadResult = await storageProvider.upload(file, "attachments");

    const fileRecord = await prisma.file.create({
      data: {
        name: file.originalname,
        url: uploadResult.url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploaderId,
        projectId,
        taskId,
      },
    });

    return Result.ok(fileRecord);
  }

  /**
   * List all file attachments for a task.
   */
  async getTaskAttachments(taskId: string): AsyncResult<any[]> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return Result.err(new NotFoundError("Task"));
    }

    const files = await prisma.file.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

    return Result.ok(files);
  }

  /**
   * Remove a file attachment (deletes physical file + DB record).
   */
  async deleteAttachment(id: string, userId: string, isAdmin: boolean): AsyncResult<void> {
    const fileRecord = await prisma.file.findUnique({ where: { id } });
    if (!fileRecord) {
      return Result.err(new NotFoundError("File Attachment"));
    }

    // Uploader or workspace admins can delete attachments
    if (fileRecord.uploaderId !== userId && !isAdmin) {
      return Result.err(new ForbiddenError("You do not have permission to delete this file"));
    }

    // Delete from storage (Cloudinary or local uploads folder)
    await storageProvider.delete(fileRecord.url);

    // Delete database record
    await prisma.file.delete({ where: { id } });

    return Result.ok(undefined);
  }

  /**
   * Upload an organization logo.
   */
  async uploadLogo(file: Express.Multer.File): AsyncResult<{ url: string }> {
    const uploadResult = await storageProvider.upload(file, "logos");
    return Result.ok({ url: uploadResult.url });
  }
}
