import { validate } from "@/middlewares/validate";
import { loginSchema, registerSchema } from "@syncspace/shared";

/**
 * Validation middlewares for authentication request bodies.
 */
export const validateRegister = validate({ body: registerSchema });
export const validateLogin = validate({ body: loginSchema });
