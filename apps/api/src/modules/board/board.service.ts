import { NotFoundError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import { cacheService } from "@/infrastructure/cache/cacheService";
import { prisma } from "@/infrastructure/database/prismaClient";

export class BoardService {
  /**
   * Fetch the Kanban board structure for a project, including columns and nested tasks.
   */
  async getProjectBoardWithTasks(projectId: string): AsyncResult<any> {
    const cacheKey = `project:${projectId}:board`;
    const cachedBoard = await cacheService.get<any>(cacheKey);
    if (cachedBoard) {
      return Result.ok(cachedBoard);
    }

    // Locate the first board associated with the project (we initialize a Default Board during project creation)
    let board = await prisma.board.findFirst({
      where: { projectId },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            tasks: {
              orderBy: { position: "asc" },
              include: {
                assignee: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
                _count: {
                  select: { comments: true },
                },
              },
            },
          },
        },
      },
    });

    // Fallback: If no board exists for some reason, initialize one now
    if (!board) {
      board = await prisma.$transaction(async (tx) => {
        const createdBoard = await tx.board.create({
          data: {
            name: "Default Board",
            projectId,
          },
        });

        await tx.column.createMany({
          data: [
            { name: "Backlog", position: 0, boardId: createdBoard.id, color: "#9ca3af" },
            { name: "To Do", position: 1, boardId: createdBoard.id, color: "#60a5fa" },
            { name: "In Progress", position: 2, boardId: createdBoard.id, color: "#f59e0b" },
            { name: "Done", position: 3, boardId: createdBoard.id, color: "#10b981" },
          ],
        });

        return tx.board.findUnique({
          where: { id: createdBoard.id },
          include: {
            columns: {
              orderBy: { position: "asc" },
              include: {
                tasks: {
                  orderBy: { position: "asc" },
                  include: {
                    assignee: {
                      select: { id: true, name: true, email: true, avatarUrl: true },
                    },
                    _count: {
                      select: { comments: true },
                    },
                  },
                },
              },
            },
          },
        }) as any;
      });
    }

    if (!board) {
      return Result.err(new NotFoundError("Kanban Board"));
    }

    // Save cache in Redis
    await cacheService.set(cacheKey, board);

    return Result.ok(board);
  }
}
