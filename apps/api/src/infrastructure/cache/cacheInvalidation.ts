import { cacheService } from "./cacheService";

import { prisma } from "@/infrastructure/database/prismaClient";
import { logger } from "@/infrastructure/logger";

/**
 * Invalidate project board and analytics caches by board ID.
 */
export async function invalidateCacheByBoardId(boardId: string): Promise<void> {
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { projectId: true },
    });
    if (board) {
      await cacheService.invalidateProjectCache(board.projectId);
    }
  } catch (error) {
    logger.error({ err: error, boardId }, "CacheInvalidation: failed by board ID");
  }
}

/**
 * Invalidate project board and analytics caches by column ID.
 */
export async function invalidateCacheByColumnId(columnId: string): Promise<void> {
  try {
    const col = await prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (col) {
      await invalidateCacheByBoardId(col.boardId);
    }
  } catch (error) {
    logger.error({ err: error, columnId }, "CacheInvalidation: failed by column ID");
  }
}

/**
 * Invalidate project board and analytics caches by task ID.
 */
export async function invalidateCacheByTaskId(taskId: string): Promise<void> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { columnId: true },
    });
    if (task) {
      await invalidateCacheByColumnId(task.columnId);
    }
  } catch (error) {
    logger.error({ err: error, taskId }, "CacheInvalidation: failed by task ID");
  }
}
