import { z } from "zod";

import { createOrganizationSchema, updateMemberRoleSchema } from "@syncspace/shared";

import { validate } from "@/middlewares/validate";

const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(64).optional(),
  description: z.string().max(500).optional().nullable(),
  website: z.string().url().max(100).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
});

export const validateCreateOrganization = validate({ body: createOrganizationSchema });
export const validateUpdateOrganization = validate({ body: updateOrganizationSchema });
export const validateUpdateMemberRole = validate({ body: updateMemberRoleSchema });
