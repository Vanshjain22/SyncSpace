import { z } from "zod";

import { validate } from "@/middlewares/validate";

const projectBodySchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(100).trim(),
  description: z.string().max(500, "Description must be under 500 characters").optional(),
});

const updateProjectBodySchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  coverColor: z.string().max(30).optional().nullable(),
  isArchived: z.boolean().optional(),
});

export const validateCreateProject = validate({ body: projectBodySchema });
export const validateUpdateProject = validate({ body: updateProjectBodySchema });
