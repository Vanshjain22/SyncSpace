import { type NextFunction, type Request, type Response } from "express";

import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/core/errors/HttpErrors";
import { prisma } from "@/infrastructure/database/prismaClient";

import { OrganizationService } from "./organization.service";

const orgService = new OrganizationService();

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await orgService.createOrganization(req.user.sub, req.body);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(201).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await orgService.getUserOrganizations(req.user.sub);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orgService.getOrganizationById(req.params.id!);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orgService.getOrganizationBySlug(req.params.slug!);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await orgService.updateOrganization(req.params.id!, req.body, req.user.sub);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await orgService.deleteOrganization(req.params.id!, req.user.sub);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orgService.getOrganizationMembers(req.params.orgId!);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await orgService.updateMemberRole(
      req.params.orgId!,
      req.params.id!,
      req.body.role,
      req.user.sub,
    );
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const { orgId, id } = req.params;

    // Load the member being removed
    const member = await prisma.organizationMember.findUnique({
      where: { id },
    });

    if (!member || member.organizationId !== orgId) {
      next(new NotFoundError("Member"));
      return;
    }

    // Check authorization:
    // 1. Caller is OWNER or ADMIN
    // 2. Caller is removing themselves (leaving)
    const callerMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.sub,
          organizationId: orgId,
        },
      },
    });

    if (!callerMembership) {
      next(new ForbiddenError("Access denied"));
      return;
    }

    const isSelf = member.userId === req.user.sub;
    const isAuthorized =
      callerMembership.role === "OWNER" || callerMembership.role === "ADMIN" || isSelf;

    if (!isAuthorized) {
      next(new ForbiddenError("You do not have permission to remove this member"));
      return;
    }

    const result = await orgService.removeMember(orgId!, id!);
    if (result.isErr()) {
      next(result.error);
      return;
    }

    // Create activity log for member removal
    await prisma.activityLog.create({
      data: {
        action: isSelf ? "LEFT_ORGANIZATION" : "REMOVED_MEMBER",
        entityType: "USER",
        entityId: member.userId,
        userId: req.user.sub,
        organizationId: orgId,
        metadata: { memberUserId: member.userId },
      },
    });

    res.status(200).json({
      success: true,
      message: isSelf ? "Left organization successfully" : "Member removed successfully",
    });
  } catch (error) {
    next(error);
  }
}
