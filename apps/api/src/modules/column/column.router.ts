import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import { create, remove, reorder, update } from "./column.controller";
import { validateCreateColumn, validateUpdateColumn } from "./column.validator";

const router = Router();

router.post("/board/:boardId", authenticate, authorize(), validateCreateColumn, create);
router.patch("/:id", authenticate, authorize(), validateUpdateColumn, update);
router.delete("/:id", authenticate, authorize("OWNER", "ADMIN"), remove);
router.put("/board/:boardId/reorder", authenticate, authorize(), reorder);

export { router as columnRouter };
