import { z } from "zod";

// ─── Primitive Schemas ────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(64, "Slug must be at most 64 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens");

export const emailSchema = z.string().email("Invalid email address").toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Search & Filter ─────────────────────────────────────────────────────────

export const searchSchema = z.object({
  query: z.string().min(1).max(255).optional(),
});

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Organization Schemas ────────────────────────────────────────────────────

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters").max(100).trim(),
  slug: slugSchema,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

// ─── Project Schemas ──────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).optional(),
  organizationId: uuidSchema,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// ─── Organization Member & Invite Schemas ────────────────────────────────────

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

// ─── Kanban & Tasks Schemas ──────────────────────────────────────────────────

export const createColumnSchema = z.object({
  name: z.string().min(1, "Column name is required").max(50),
  color: z.string().max(30).optional().nullable(),
});

export type CreateColumnInput = z.infer<typeof createColumnSchema>;

export const createTaskSchema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters").max(150),
  description: z.string().max(2000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  labels: z.array(z.string()).default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema
  .extend({
    status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
    columnId: z.string().uuid().optional(),
    position: z.number().int().nonnegative().optional(),
  })
  .partial();

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment must not be empty").max(1000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
