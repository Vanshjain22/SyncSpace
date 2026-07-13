import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import { create, listOrgTasks, remove, reorder, update } from "./task.controller";
import { validateCreateTask, validateUpdateTask } from "./task.validator";

const router = Router();

router.get("/org/:orgId", authenticate, authorize(), listOrgTasks);
router.post("/column/:columnId", authenticate, authorize(), validateCreateTask, create);
router.patch("/:id", authenticate, authorize(), validateUpdateTask, update);
router.delete("/:id", authenticate, authorize(), remove);
router.put("/reorder", authenticate, authorize(), reorder);

export { router as taskRouter };
