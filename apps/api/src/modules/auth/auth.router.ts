import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authRateLimiter } from "@/middlewares/rateLimiter";

import { changePassword, login, logout, me, refresh, register, updateMe } from "./auth.controller";
import { validateLogin, validateRegister } from "./auth.validator";

const router = Router();

// Apply auth rate limiter strictly to registration and login
router.post("/register", authRateLimiter, validateRegister, register);
router.post("/login", authRateLimiter, validateLogin, login);
router.post("/logout", logout);
router.post("/refresh", refresh);

// Protected profile endpoint
router.get("/me", authenticate, me);
router.patch("/me", authenticate, updateMe);
router.post("/change-password", authenticate, changePassword);

export { router as authRouter };
