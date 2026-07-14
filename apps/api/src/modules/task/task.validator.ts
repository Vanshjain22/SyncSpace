import { validate } from "@/middlewares/validate";
import { createTaskSchema, updateTaskSchema } from "@syncspace/shared";

export const validateCreateTask = validate({ body: createTaskSchema });
export const validateUpdateTask = validate({ body: updateTaskSchema });
