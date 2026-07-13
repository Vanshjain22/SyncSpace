import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import { getBoard } from "./board.controller";

const router = Router();

router.get("/project/:projectId", authenticate, authorize(), getBoard);

export { router as boardRouter };
