import { type NextFunction, type Request, type Response } from "express";

import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/core/errors/HttpErrors";
import { prisma } from "@/infrastructure/database/prismaClient";
import { type OrganizationRole, ROLE_HIERARCHY } from "@syncspace/shared";

/**
 * RBAC Authorization middleware factory.
 *
 * Verifies if the authenticated user has sufficient permissions inside the
 * current organization context.
 *
 * - Extracts organizationId from params (`orgId`, `id` under /organizations) or body.
 * - Resolves organizationId from the project if inside a project-specific route.
 * - Looks up user membership and evaluates role hierarchy (OWNER > ADMIN > MEMBER).
 *
 * Usage:
 *   router.patch("/:id", authenticate, authorize("OWNER", "ADMIN"), updateOrgHandler)
 */
export function authorize(...requiredRoles: OrganizationRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new UnauthorizedError("Authentication is required to access this resource"));
        return;
      }

      const userId = req.user.sub;
      let orgId = req.params.orgId || req.body.organizationId;

      // Resolve from /organizations/:id route where the parameter is named 'id'
      if (!orgId && req.baseUrl.endsWith("/organizations") && req.params.id) {
        orgId = req.params.id;
      }

      // Resolve from /projects/:id routes or route parameters containing projectId
      const projectId =
        req.params.projectId ||
        (req.baseUrl.includes("/projects") && req.params.id ? req.params.id : undefined);

      if (!orgId && projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { organizationId: true },
        });

        if (!project) {
          next(new NotFoundError("Project"));
          return;
        }

        orgId = project.organizationId;
      }

      // Resolve from boardId parameter
      if (!orgId && req.params.boardId) {
        const board = await prisma.board.findUnique({
          where: { id: req.params.boardId },
          select: { project: { select: { organizationId: true } } },
        });
        if (board) {
          orgId = board.project.organizationId;
        }
      }

      // Resolve from columnId/id parameter in /columns routes
      if (!orgId && req.baseUrl.includes("/columns") && req.params.id) {
        const column = await prisma.column.findUnique({
          where: { id: req.params.id },
          select: { board: { select: { project: { select: { organizationId: true } } } } },
        });
        if (column) {
          orgId = column.board.project.organizationId;
        }
      }

      // Resolve from columnId parameter (often used in tasks routes)
      if (!orgId && req.params.columnId) {
        const column = await prisma.column.findUnique({
          where: { id: req.params.columnId },
          select: { board: { select: { project: { select: { organizationId: true } } } } },
        });
        if (column) {
          orgId = column.board.project.organizationId;
        }
      }

      // Resolve from taskId/id parameter in /tasks routes
      if (!orgId && req.baseUrl.includes("/tasks") && req.params.id) {
        const task = await prisma.task.findUnique({
          where: { id: req.params.id },
          select: {
            column: {
              select: { board: { select: { project: { select: { organizationId: true } } } } },
            },
          },
        });
        if (task) {
          orgId = task.column.board.project.organizationId;
        }
      }

      // Resolve from taskId parameter (used in comments routes)
      if (!orgId && req.params.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: req.params.taskId },
          select: {
            column: {
              select: { board: { select: { project: { select: { organizationId: true } } } } },
            },
          },
        });
        if (task) {
          orgId = task.column.board.project.organizationId;
        }
      }

      // Resolve from commentId/id parameter in /comments routes
      if (!orgId && req.baseUrl.includes("/comments") && req.params.id) {
        const comment = await prisma.comment.findUnique({
          where: { id: req.params.id },
          select: {
            task: {
              select: {
                column: {
                  select: { board: { select: { project: { select: { organizationId: true } } } } },
                },
              },
            },
          },
        });
        if (comment) {
          orgId = comment.task.column.board.project.organizationId;
        }
      }

      // Resolve from fileId/id parameter in /files routes
      if (!orgId && req.baseUrl.includes("/files") && req.params.id) {
        const fileRecord = await prisma.file.findUnique({
          where: { id: req.params.id },
          select: { project: { select: { organizationId: true } } },
        });
        if (fileRecord && fileRecord.project) {
          orgId = fileRecord.project.organizationId;
        }
      }

      // Resolve from body-level taskId
      if (!orgId && req.body.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: req.body.taskId },
          select: {
            column: {
              select: { board: { select: { project: { select: { organizationId: true } } } } },
            },
          },
        });
        if (task) {
          orgId = task.column.board.project.organizationId;
        }
      }

      // Resolve from body-level columnId
      if (!orgId && req.body.columnId) {
        const column = await prisma.column.findUnique({
          where: { id: req.body.columnId },
          select: { board: { select: { project: { select: { organizationId: true } } } } },
        });
        if (column) {
          orgId = column.board.project.organizationId;
        }
      }

      if (!orgId) {
        next(new ForbiddenError("Access denied — organization context is missing"));
        return;
      }

      // Look up user's role within the organization
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: orgId,
          },
        },
      });

      if (!membership) {
        next(new ForbiddenError("Access denied — you are not a member of this organization"));
        return;
      }

      // Store user's role on request for downstream handlers
      req.userOrgRole = membership.role;

      // If any member is allowed and no specific roles are required
      if (requiredRoles.length === 0) {
        next();
        return;
      }

      // Compare using role hierarchy weights
      const userWeight = ROLE_HIERARCHY[membership.role];

      const isAuthorized = requiredRoles.some((requiredRole) => {
        const requiredWeight = ROLE_HIERARCHY[requiredRole];
        return userWeight >= requiredWeight;
      });

      if (!isAuthorized) {
        next(new ForbiddenError("Access denied — insufficient organization privileges"));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
