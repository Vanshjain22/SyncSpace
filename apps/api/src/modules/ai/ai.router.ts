import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";

import { askAssistant, generateReport } from "./ai.controller";

const router = Router();

// Route to generate a project status report
router.post("/projects/:projectId/report", authenticate, generateReport);

// Route to chat with the project assistant
router.post("/chat", authenticate, askAssistant);

export { router as aiRouter };
