import { type AsyncResult, Result } from "@/core/result/Result";
import { prisma } from "@/infrastructure/database/prismaClient";

export class SearchService {
  /**
   * Search tasks globally across the active organization workspace.
   */
  async searchWorkspaceTasks(orgId: string, queryText: string): AsyncResult<any[]> {
    if (!queryText.trim()) {
      return Result.ok([]);
    }

    const tasks = await prisma.task.findMany({
      where: {
        column: {
          board: {
            project: {
              organizationId: orgId,
            },
          },
        },
        OR: [
          { title: { contains: queryText, mode: "insensitive" } },
          { description: { contains: queryText, mode: "insensitive" } },
        ],
      },
      include: {
        column: {
          select: {
            id: true,
            name: true,
            board: {
              select: {
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 20, // Limit search responses
    });

    return Result.ok(tasks);
  }
}
