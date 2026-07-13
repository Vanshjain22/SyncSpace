import { Router } from "express";

import { 
  register, 
  login, 
  logout, 
  refresh, 
  me 
} from "./auth.controller";
import { 
  validateRegister, 
  validateLogin 
} from "./auth.validator";

import { authenticate } from "@/middlewares/authenticate";
import { authRateLimiter } from "@/middlewares/rateLimiter";

const router = Router();

// Apply auth rate limiter strictly to registration and login
router.post("/register", authRateLimiter, validateRegister, register);
router.post("/login", authRateLimiter, validateLogin, login);
router.post("/logout", logout);
router.post("/refresh", refresh);

// Protected profile endpoint
router.get("/me", authenticate, me);

export { router as authRouter };
