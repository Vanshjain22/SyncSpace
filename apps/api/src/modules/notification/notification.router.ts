import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";

import { list, markAllRead, markRead } from "./notification.controller";

const router = Router();

router.get("/", authenticate, list);
router.patch("/:id/read", authenticate, markRead);
router.post("/read-all", authenticate, markAllRead);

export { router as notificationRouter };
