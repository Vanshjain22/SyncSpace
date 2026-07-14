import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";

import { askAssistant, generateReport, getDashboardInsights } from "./ai.controller";

const router = Router();

// Route to generate a project status report
router.post("/projects/:projectId/report", authenticate, generateReport);

// Route to chat with the project assistant
router.post("/chat", authenticate, askAssistant);

// Route to fetch real-time AI dashboard welcome greeting & dynamic action chips
router.get("/org/:orgId/insights", authenticate, getDashboardInsights);

export { router as aiRouter };
