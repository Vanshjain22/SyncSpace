/**
 * Shared TypeScript types for SyncSpace.
 * Used by both the API and the web application.
 */

// ─── API Response Envelope ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  statusCode: number;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export const OrganizationRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type OrganizationRole = (typeof OrganizationRole)[keyof typeof OrganizationRole];

export const ProjectRole = {
  MANAGER: "MANAGER",
  CONTRIBUTOR: "CONTRIBUTOR",
  VIEWER: "VIEWER",
} as const;

export type ProjectRole = (typeof ProjectRole)[keyof typeof ProjectRole];

// ─── Task Priority & Status ───────────────────────────────────────────────────

export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskStatus = {
  BACKLOG: "BACKLOG",
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "IN_REVIEW",
  DONE: "DONE",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// ─── Notifications ────────────────────────────────────────────────────────────

export const NotificationType = {
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_COMMENTED: "TASK_COMMENTED",
  TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",
  MENTION: "MENTION",
  INVITE_RECEIVED: "INVITE_RECEIVED",
  INVITE_ACCEPTED: "INVITE_ACCEPTED",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// ─── Common Entity Types ───────────────────────────────────────────────────────

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface WithId {
  id: string;
}

export type Entity<T> = T & WithId & Timestamps;

// ─── Auth/User Types ─────────────────────────────────────────────────────────

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}
