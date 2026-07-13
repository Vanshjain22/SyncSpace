import { Router } from "express";

import { getProjectMetrics, getOrgDashboardMetrics } from "./analytics.controller";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

const router = Router();

router.get("/project/:projectId", authenticate, authorize(), getProjectMetrics);
router.get("/org/:orgId/dashboard-stats", authenticate, authorize(), getOrgDashboardMetrics);

export { router as analyticsRouter };
