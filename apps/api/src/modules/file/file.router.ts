import { Router } from "express";
import multer from "multer";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import { list, remove, upload } from "./file.controller";

const router = Router();

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.post(
  "/upload/task/:taskId",
  authenticate,
  authorize(),
  uploadMiddleware.single("file"),
  upload,
);
router.get("/task/:taskId", authenticate, authorize(), list);
router.delete("/:id", authenticate, authorize(), remove);

export { router as fileRouter };
