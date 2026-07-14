import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import { getOrgDashboardMetrics, getProjectMetrics } from "./analytics.controller";

const router = Router();

router.get("/project/:projectId", authenticate, authorize(), getProjectMetrics);
router.get("/org/:orgId/dashboard-stats", authenticate, authorize(), getOrgDashboardMetrics);

export { router as analyticsRouter };
