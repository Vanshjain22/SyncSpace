import { createTaskSchema, updateTaskSchema } from "@syncspace/shared";

import { validate } from "@/middlewares/validate";

export const validateCreateTask = validate({ body: createTaskSchema });
export const validateUpdateTask = validate({ body: updateTaskSchema });
