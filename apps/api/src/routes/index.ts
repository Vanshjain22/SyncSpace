import { Router } from "express";

import { aiRouter } from "@/modules/ai/ai.router";
import { analyticsRouter } from "@/modules/analytics/analytics.router";
import { authRouter } from "@/modules/auth/auth.router";
import { boardRouter } from "@/modules/board/board.router";
import { columnRouter } from "@/modules/column/column.router";
import { commentRouter } from "@/modules/comment/comment.router";
import { fileRouter } from "@/modules/file/file.router";
import { healthRouter } from "@/modules/health/health.router";
import { inviteRouter } from "@/modules/invite/invite.router";
import { notificationRouter } from "@/modules/notification/notification.router";
import { organizationRouter } from "@/modules/organization/organization.router";
import { projectRouter } from "@/modules/project/project.router";
import { searchRouter } from "@/modules/search/search.router";
import { taskRouter } from "@/modules/task/task.router";

/**
 * Root API router.
 *
 * All module routers are mounted here under /api.
 * Phase-by-phase modules will be added below as they are built.
 */
const router = Router();

// ─── Core ─────────────────────────────────────────────────────────────────────
router.use("/health", healthRouter);

// ─── Auth (Phase 2) ───────────────────────────────────────────────────────────
router.use("/auth", authRouter);

// ─── Organizations (Phase 3) ──────────────────────────────────────────────────
router.use("/organizations", organizationRouter);
router.use("/invites", inviteRouter);

// ─── Projects (Phase 3) ───────────────────────────────────────────────────────
router.use("/projects", projectRouter);

// ─── Tasks & Kanban (Phase 4) ─────────────────────────────────────────────────
router.use("/boards", boardRouter);
router.use("/columns", columnRouter);
router.use("/tasks", taskRouter);
router.use("/comments", commentRouter);

// ─── File Uploads, Analytics & Search (Phase 6) ───────────────────────────────
router.use("/files", fileRouter);
router.use("/analytics", analyticsRouter);
router.use("/search", searchRouter);
router.use("/ai", aiRouter);

// ─── Notifications (Phase 8) ──────────────────────────────────────────────────
router.use("/notifications", notificationRouter);

export { router as apiRouter };
