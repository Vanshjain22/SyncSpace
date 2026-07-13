import { type NextFunction, type Request, type Response } from "express";

import { UnauthorizedError } from "@/core/errors/HttpErrors";

import { InviteService } from "./invite.service";

const inviteService = new InviteService();

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await inviteService.createInvite(
      req.params.orgId!,
      req.user.sub,
      req.body.email,
      req.body.role,
    );
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
    const result = await inviteService.getOrgInvites(req.params.orgId!);
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

export async function revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await inviteService.revokeInvite(req.params.orgId!, req.params.id!);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      message: "Invitation revoked successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await inviteService.getInviteByToken(req.params.token!);
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

export async function accept(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const result = await inviteService.acceptInvite(req.user.sub, req.params.token!);
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

export async function decline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await inviteService.declineInvite(req.params.token!);
    if (result.isErr()) {
      next(result.error);
      return;
    }
    res.status(200).json({
      success: true,
      message: "Invitation declined successfully",
    });
  } catch (error) {
    next(error);
  }
}
