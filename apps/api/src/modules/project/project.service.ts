import { ConflictError, ForbiddenError, NotFoundError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import { prisma } from "@/infrastructure/database/prismaClient";
import { type CreateProjectInput } from "@syncspace/shared";

export class ProjectService {
  /**
   * Create a new project under an organization and initialize a default Kanban board.
   */
  async createProject(
    userId: string,
    orgId: string,
    input: Omit<CreateProjectInput, "organizationId">,
  ): AsyncResult<any> {
    const slug = this.slugify(input.name);

    // Verify slug uniqueness inside this organization
    const existingProject = await prisma.project.findFirst({
      where: {
        organizationId: orgId,
        slug,
      },
    });

    if (existingProject) {
      return Result.err(
        new ConflictError("A project with a similar name already exists in this organization"),
      );
    }

    const project = await prisma.$transaction(async (tx) => {
      // 1. Create project
      const createdProject = await tx.project.create({
        data: {
          name: input.name,
          description: input.description,
          slug,
          organizationId: orgId,
        },
      });

      // 2. Add creator as MANAGER member
      await tx.projectMember.create({
        data: {
          userId,
          projectId: createdProject.id,
          role: "MANAGER",
        },
      });

      // 3. Initialize default Kanban Board
      const board = await tx.board.create({
        data: {
          name: "Default Board",
          projectId: createdProject.id,
        },
      });

      // 4. Initialize default Columns
      await tx.column.createMany({
        data: [
          { name: "Backlog", position: 0, boardId: board.id, color: "#9ca3af" },
          { name: "To Do", position: 1, boardId: board.id, color: "#60a5fa" },
          { name: "In Progress", position: 2, boardId: board.id, color: "#f59e0b" },
          { name: "Done", position: 3, boardId: board.id, color: "#10b981" },
        ],
      });

      // 5. Create activity log entry
      await tx.activityLog.create({
        data: {
          action: "CREATED_PROJECT",
          entityType: "PROJECT",
          entityId: createdProject.id,
          userId,
          organizationId: orgId,
          projectId: createdProject.id,
          metadata: { projectName: input.name },
        },
      });

      return createdProject;
    });

    return Result.ok(project);
  }

  /**
   * List all projects within an organization.
   * - Organization owners/admins can see all projects.
   * - Organization members can only see projects they are members of.
   */
  async getOrgProjects(userId: string, orgId: string): AsyncResult<any[]> {
    // Check user role in organization
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

    const isAdminOrOwner = orgMembership.role === "OWNER" || orgMembership.role === "ADMIN";

    let projects;
    if (isAdminOrOwner) {
      projects = await prisma.project.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Find projects where user is a ProjectMember
      projects = await prisma.project.findMany({
        where: {
          organizationId: orgId,
          members: {
            some: { userId },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Compute progress for each project based on its task completion rates
    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const boards = await prisma.board.findMany({
          where: { projectId: project.id },
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

        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...project,
          progress,
        };
      }),
    );

    return Result.ok(projectsWithProgress);
  }

  /**
   * Get project details including members (only if user has access).
   */
  async getProjectById(userId: string, id: string): AsyncResult<any> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!project) {
      return Result.err(new NotFoundError("Project"));
    }

    // Verify access
    const hasOrgAccess = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: project.organizationId,
        },
      },
    });

    if (!hasOrgAccess) {
      return Result.err(new ForbiddenError("Access denied"));
    }

    const isOrgAdminOrOwner = hasOrgAccess.role === "OWNER" || hasOrgAccess.role === "ADMIN";

    const isProjectMember = project.members.some((m) => m.userId === userId);

    if (!isOrgAdminOrOwner && !isProjectMember) {
      return Result.err(new ForbiddenError("You do not have access to this project"));
    }

    return Result.ok(project);
  }

  /**
   * Update project details.
   */
  async updateProject(
    userId: string,
    id: string,
    data: { name?: string; description?: string; coverColor?: string; isArchived?: boolean },
  ): AsyncResult<any> {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return Result.err(new NotFoundError("Project"));
    }

    // Verify user has permission (OWNER/ADMIN in organization, or MANAGER in project)
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: project.organizationId,
        },
      },
    });

    const isOrgAdminOrOwner =
      orgMembership && (orgMembership.role === "OWNER" || orgMembership.role === "ADMIN");

    const projectMembership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: id,
        },
      },
    });

    const isProjectManager = projectMembership && projectMembership.role === "MANAGER";

    if (!isOrgAdminOrOwner && !isProjectManager) {
      return Result.err(new ForbiddenError("You do not have permission to update this project"));
    }

    const updatePayload: any = { ...data };

    if (data.name && data.name !== project.name) {
      const slug = this.slugify(data.name);
      // Ensure slug uniqueness
      const existingSlug = await prisma.project.findFirst({
        where: {
          organizationId: project.organizationId,
          slug,
          NOT: { id },
        },
      });
      if (existingSlug) {
        return Result.err(new ConflictError("A project with a similar name already exists"));
      }
      updatePayload.slug = slug;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updatePayload,
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        action: data.isArchived ? "ARCHIVED_PROJECT" : "UPDATED_PROJECT",
        entityType: "PROJECT",
        entityId: id,
        userId,
        organizationId: project.organizationId,
        projectId: id,
        metadata: { projectName: updated.name },
      },
    });

    return Result.ok(updated);
  }

  /**
   * Delete a project.
   */
  async deleteProject(userId: string, id: string): AsyncResult<void> {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return Result.err(new NotFoundError("Project"));
    }

    // Verify user has permission (OWNER/ADMIN in organization, or MANAGER in project)
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: project.organizationId,
        },
      },
    });

    const isOrgAdminOrOwner =
      orgMembership && (orgMembership.role === "OWNER" || orgMembership.role === "ADMIN");

    const projectMembership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: id,
        },
      },
    });

    const isProjectManager = projectMembership && projectMembership.role === "MANAGER";

    if (!isOrgAdminOrOwner && !isProjectManager) {
      return Result.err(new ForbiddenError("You do not have permission to delete this project"));
    }

    // Create activity log before delete cascade
    await prisma.activityLog.create({
      data: {
        action: "DELETED_PROJECT",
        entityType: "PROJECT",
        entityId: id,
        userId,
        organizationId: project.organizationId,
        projectId: id,
        metadata: { projectName: project.name },
      },
    });

    await prisma.project.delete({ where: { id } });
    return Result.ok(undefined);
  }

  /**
   * Slugify a string.
   */
  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  }
}
