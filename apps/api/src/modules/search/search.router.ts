import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import { searchTasks } from "./search.controller";

const router = Router();

router.get("/org/:orgId", authenticate, authorize(), searchTasks);

export { router as searchRouter };
