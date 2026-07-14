import { NotFoundError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import {
  invalidateCacheByBoardId,
  invalidateCacheByColumnId,
} from "@/infrastructure/cache/cacheInvalidation";
import { prisma } from "@/infrastructure/database/prismaClient";
import { type CreateColumnInput } from "@syncspace/shared";

export class ColumnService {
  /**
   * Create a new column on a Kanban board. Placed at the end of the list.
   */
  async createColumn(boardId: string, input: CreateColumnInput): AsyncResult<any> {
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      return Result.err(new NotFoundError("Board"));
    }

    const currentCount = await prisma.column.count({
      where: { boardId },
    });

    const column = await prisma.column.create({
      data: {
        name: input.name,
        color: input.color || "#e5e7eb",
        position: currentCount,
        boardId,
      },
    });

    // Invalidate board cache
    await invalidateCacheByBoardId(boardId);

    return Result.ok(column);
  }

  /**
   * Update column properties (e.g. name, color).
   */
  async updateColumn(id: string, data: { name?: string; color?: string }): AsyncResult<any> {
    const column = await prisma.column.findUnique({ where: { id } });
    if (!column) {
      return Result.err(new NotFoundError("Column"));
    }

    const updated = await prisma.column.update({
      where: { id },
      data,
    });

    // Invalidate board cache
    await invalidateCacheByColumnId(id);

    return Result.ok(updated);
  }

  /**
   * Delete a column and all nested tasks.
   */
  async deleteColumn(id: string): AsyncResult<any> {
    const column = await prisma.column.findUnique({ where: { id } });
    if (!column) {
      return Result.err(new NotFoundError("Column"));
    }

    // Invalidate board cache using boardId before deleting records
    await invalidateCacheByBoardId(column.boardId);

    const deleted = await prisma.column.delete({ where: { id } });
    return Result.ok(deleted);
  }

  /**
   * Reorder column positions inside a board using a database transaction.
   */
  async reorderColumns(boardId: string, columnIds: string[]): AsyncResult<void> {
    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < columnIds.length; index++) {
        const id = columnIds[index];
        if (id) {
          await tx.column.updateMany({
            where: { id, boardId },
            data: { position: index },
          });
        }
      }
    });

    // Invalidate board cache
    await invalidateCacheByBoardId(boardId);

    return Result.ok(undefined);
  }
}
