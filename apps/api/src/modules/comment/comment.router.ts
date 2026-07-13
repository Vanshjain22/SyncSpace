import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import { create, list, remove } from "./comment.controller";
import { validateCreateComment } from "./comment.validator";

const router = Router();

router.get("/task/:taskId", authenticate, authorize(), list);
router.post("/task/:taskId", authenticate, authorize(), validateCreateComment, create);
router.delete("/:id", authenticate, authorize(), remove);

export { router as commentRouter };
