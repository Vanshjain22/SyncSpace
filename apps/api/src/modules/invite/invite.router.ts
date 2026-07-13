import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import { accept, create, decline, getInvite, list, revoke } from "./invite.controller";
import { validateCreateInvite } from "./invite.validator";

const router = Router();

// ─── Public/Global Invite Endpoints ───────────────────────────────────────────
router.get("/token/:token", getInvite);
router.post("/token/:token/accept", authenticate, accept);
router.post("/token/:token/decline", decline);

// ─── Org Scoped Invite Endpoints ──────────────────────────────────────────────
router.post("/org/:orgId", authenticate, authorize("OWNER", "ADMIN"), validateCreateInvite, create);
router.get("/org/:orgId", authenticate, authorize("OWNER", "ADMIN"), list);
router.delete("/org/:orgId/:id", authenticate, authorize("OWNER", "ADMIN"), revoke);

export { router as inviteRouter };
