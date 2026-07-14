import { BadRequestError, ConflictError, NotFoundError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import { prisma } from "@/infrastructure/database/prismaClient";
import { type CreateOrganizationInput, type OrganizationRole } from "@syncspace/shared";

export class OrganizationService {
  /**
   * Create a new organization and assign creator as OWNER.
   */
  async createOrganization(userId: string, input: CreateOrganizationInput): AsyncResult<any> {
    const existingSlug = await prisma.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existingSlug) {
      return Result.err(new ConflictError("Organization URL slug is already taken"));
    }

    const org = await prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: createdOrg.id,
          role: "OWNER",
        },
      });

      // Create activity log inside transaction
      await tx.activityLog.create({
        data: {
          action: "CREATED_ORGANIZATION",
          entityType: "ORGANIZATION",
          entityId: createdOrg.id,
          userId,
          organizationId: createdOrg.id,
          metadata: { orgName: createdOrg.name },
        },
      });

      return createdOrg;
    });

    return Result.ok(org);
  }

  /**
   * List all organizations the user belongs to.
   */
  async getUserOrganizations(userId: string): AsyncResult<any[]> {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const orgs = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));

    return Result.ok(orgs);
  }

  /**
   * Get an organization by ID.
   */
  async getOrganizationById(id: string): AsyncResult<any> {
    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      return Result.err(new NotFoundError("Organization"));
    }

    return Result.ok(org);
  }

  /**
   * Get an organization by slug.
   */
  async getOrganizationBySlug(slug: string): AsyncResult<any> {
    const org = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!org) {
      return Result.err(new NotFoundError("Organization"));
    }

    return Result.ok(org);
  }

  /**
   * Update organization details.
   */
  async updateOrganization(
    id: string,
    data: { name?: string; slug?: string; description?: string; website?: string },
    userId: string,
  ): AsyncResult<any> {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return Result.err(new NotFoundError("Organization"));
    }

    if (data.slug && data.slug !== org.slug) {
      const slugTaken = await prisma.organization.findUnique({
        where: { slug: data.slug },
      });
      if (slugTaken) {
        return Result.err(new ConflictError("Organization URL slug is already taken"));
      }
    }

    const updated = await prisma.organization.update({
      where: { id },
      data,
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        action: "UPDATED_ORGANIZATION",
        entityType: "ORGANIZATION",
        entityId: id,
        userId,
        organizationId: id,
        metadata: { updatedFields: Object.keys(data) },
      },
    });

    return Result.ok(updated);
  }

  /**
   * Delete an organization.
   */
  async deleteOrganization(id: string, userId: string): AsyncResult<void> {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return Result.err(new NotFoundError("Organization"));
    }

    // Create activity log before deletion
    await prisma.activityLog.create({
      data: {
        action: "DELETED_ORGANIZATION",
        entityType: "ORGANIZATION",
        entityId: id,
        userId,
        organizationId: id,
        metadata: { orgName: org.name },
      },
    });

    await prisma.organization.delete({ where: { id } });
    return Result.ok(undefined);
  }

  /**
   * List members of an organization.
   */
  async getOrganizationMembers(organizationId: string): AsyncResult<any[]> {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return Result.ok(members);
  }

  /**
   * Update a member's role inside the organization.
   */
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: OrganizationRole,
    userId: string,
  ): AsyncResult<any> {
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      return Result.err(new NotFoundError("Member"));
    }

    if (member.role === "OWNER" && newRole !== "OWNER") {
      // Ensure we don't orphan the organization if they are the only OWNER
      const ownersCount = await prisma.organizationMember.count({
        where: { organizationId, role: "OWNER" },
      });
      if (ownersCount <= 1) {
        return Result.err(new BadRequestError("Cannot change role of the sole organization owner"));
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        action: "UPDATED_MEMBER_ROLE",
        entityType: "USER",
        entityId: updated.userId,
        userId,
        organizationId,
        metadata: { newRole, memberUserId: updated.userId },
      },
    });

    return Result.ok(updated);
  }

  /**
   * Remove a member from the organization.
   */
  async removeMember(organizationId: string, memberId: string): AsyncResult<void> {
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      return Result.err(new NotFoundError("Member"));
    }

    if (member.role === "OWNER") {
      const ownersCount = await prisma.organizationMember.count({
        where: { organizationId, role: "OWNER" },
      });
      if (ownersCount <= 1) {
        return Result.err(new BadRequestError("Cannot remove the sole organization owner"));
      }
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return Result.ok(undefined);
  }
}
