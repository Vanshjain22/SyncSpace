import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import { create, get, listOrgProjects, remove, update } from "./project.controller";
import { validateCreateProject, validateUpdateProject } from "./project.validator";

const router = Router();

// ─── Project Scoped Endpoints ─────────────────────────────────────────────────
router.get("/:id", authenticate, get);
router.patch("/:id", authenticate, validateUpdateProject, update);
router.delete("/:id", authenticate, remove);

// ─── Org Scoped Project Endpoints ─────────────────────────────────────────────
router.post("/org/:orgId", authenticate, authorize(), validateCreateProject, create);
router.get("/org/:orgId", authenticate, authorize(), listOrgProjects);

export { router as projectRouter };
