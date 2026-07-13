import { type OrganizationRole } from "@syncspace/shared";

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import { prisma } from "@/infrastructure/database/prismaClient";

const INVITE_EXPIRY_DAYS = 7;

export class InviteService {
  /**
   * Create an email invitation to join an organization.
   */
  async createInvite(
    organizationId: string,
    senderId: string,
    email: string,
    role: OrganizationRole,
  ): AsyncResult<any> {
    const formattedEmail = email.toLowerCase().trim();

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: { email: formattedEmail },
      },
    });

    if (existingMember) {
      return Result.err(new ConflictError("User is already a member of this organization"));
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    // Upsert the invite (overwrite if pending exists for this email+org)
    const invite = await prisma.invite.upsert({
      where: {
        email_organizationId: {
          email: formattedEmail,
          organizationId,
        },
      },
      update: {
        role,
        status: "PENDING",
        senderId,
        expiresAt,
      },
      create: {
        email: formattedEmail,
        organizationId,
        senderId,
        role,
        expiresAt,
      },
    });

    // Create activity log entry for inviting member (no token leakage)
    await prisma.activityLog.create({
      data: {
        action: "INVITED_MEMBER",
        entityType: "INVITATION",
        entityId: invite.id,
        userId: senderId,
        organizationId,
        metadata: { invitedEmail: formattedEmail, role },
      },
    });

    return Result.ok(invite);
  }

  /**
   * List pending invitations in an organization.
   */
  async getOrgInvites(organizationId: string): AsyncResult<any[]> {
    const invites = await prisma.invite.findMany({
      where: {
        organizationId,
        status: "PENDING",
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Result.ok(invites);
  }

  /**
   * Revoke/delete an invitation.
   */
  async revokeInvite(organizationId: string, id: string): AsyncResult<void> {
    const invite = await prisma.invite.findUnique({ where: { id } });

    if (!invite || invite.organizationId !== organizationId) {
      return Result.err(new NotFoundError("Invitation"));
    }

    await prisma.invite.delete({ where: { id } });
    return Result.ok(undefined);
  }

  /**
   * Fetch invite details by token (for display on landing page).
   */
  async getInviteByToken(token: string): AsyncResult<any> {
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        sender: {
          select: { name: true, email: true },
        },
      },
    });

    if (!invite) {
      return Result.err(new NotFoundError("Invitation link"));
    }

    if (invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      return Result.err(
        new BadRequestError("This invitation link has expired or already been resolved"),
      );
    }

    return Result.ok(invite);
  }

  /**
   * Accept an invitation.
   */
  async acceptInvite(userId: string, token: string): AsyncResult<any> {
    const invite = await prisma.invite.findUnique({
      where: { token },
    });

    if (!invite) {
      return Result.err(new NotFoundError("Invitation"));
    }

    if (invite.status !== "PENDING") {
      return Result.err(new BadRequestError("This invitation is no longer active"));
    }

    if (invite.expiresAt < new Date()) {
      await prisma.invite.update({
        where: { token },
        data: { status: "EXPIRED" },
      });
      return Result.err(new BadRequestError("This invitation has expired"));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return Result.err(new NotFoundError("User"));
    }

    // Safety email matching check
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return Result.err(
        new ForbiddenError("This invitation was sent to a different email address"),
      );
    }

    // Check if duplicate membership already exists (idempotent success path)
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invite.organizationId,
        },
      },
    });

    if (existingMembership) {
      await prisma.invite.update({
        where: { token },
        data: { status: "ACCEPTED" },
      });
      const org = await prisma.organization.findUnique({
        where: { id: invite.organizationId },
      });
      return Result.ok(org);
    }

    const org = await prisma.$transaction(async (tx) => {
      // 1. Create membership record
      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      });

      // 2. Mark invite as accepted
      await tx.invite.update({
        where: { token },
        data: { status: "ACCEPTED" },
      });

      // 3. Create activity log entry (no token leakage)
      await tx.activityLog.create({
        data: {
          action: "JOINED_ORGANIZATION",
          entityType: "USER",
          entityId: userId,
          userId,
          organizationId: invite.organizationId,
          metadata: { inviteId: invite.id },
        },
      });

      // 4. Retrieve organization info
      return tx.organization.findUnique({
        where: { id: invite.organizationId },
      });
    });

    return Result.ok(org);
  }

  /**
   * Decline an invitation.
   */
  async declineInvite(token: string): AsyncResult<void> {
    const invite = await prisma.invite.findUnique({ where: { token } });

    if (!invite) {
      return Result.err(new NotFoundError("Invitation"));
    }

    if (invite.status !== "PENDING") {
      return Result.err(new BadRequestError("This invitation is no longer active"));
    }

    await prisma.invite.update({
      where: { token },
      data: { status: "DECLINED" },
    });

    return Result.ok(undefined);
  }
}
