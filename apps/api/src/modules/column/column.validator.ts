import { z } from "zod";

import { createColumnSchema } from "@syncspace/shared";

import { validate } from "@/middlewares/validate";

const updateColumnSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(50).optional(),
  color: z.string().max(30).optional().nullable(),
});

export const validateCreateColumn = validate({ body: createColumnSchema });
export const validateUpdateColumn = validate({ body: updateColumnSchema });
