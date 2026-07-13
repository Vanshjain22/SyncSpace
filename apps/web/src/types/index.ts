import {
  type Entity,
  type NotificationType,
  type OrganizationRole,
  type ProjectRole,
  type TaskPriority,
  type TaskStatus,
} from "@syncspace/shared";

// ─── Re-export shared types for convenience ───────────────────────────────────
export type { OrganizationRole, ProjectRole, TaskPriority, TaskStatus, NotificationType };

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User extends Entity<{
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
}> {}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

// ─── Organization ─────────────────────────────────────────────────────────────

export interface Organization extends Entity<{
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
}> {}

export interface OrganizationWithRole extends Organization {
  role: OrganizationRole;
  memberCount: number;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project extends Entity<{
  name: string;
  description: string | null;
  slug: string;
  organizationId: string;
  coverColor: string | null;
  isArchived: boolean;
}> {}

export interface ProjectWithRole extends Project {
  role: ProjectRole;
  memberCount: number;
}

// ─── Board / Column / Task ────────────────────────────────────────────────────

export interface Board extends Entity<{
  name: string;
  projectId: string;
}> {
  columns: Column[];
}

export interface Column {
  id: string;
  name: string;
  position: number;
  boardId: string;
  color: string | null;
  tasks: Task[];
}

export interface Task extends Entity<{
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  dueDate: string | null;
  columnId: string;
  assigneeId: string | null;
  creatorId: string;
  labels: string[];
}> {
  assignee?: Pick<User, "id" | "name" | "avatarUrl"> | null;
  creator: Pick<User, "id" | "name" | "avatarUrl">;
  commentCount?: number;
  fileCount?: number;
}

// ─── Comment ─────────────────────────────────────────────────────────────────

export interface Comment extends Entity<{
  content: string;
  taskId: string;
  authorId: string;
}> {
  author: Pick<User, "id" | "name" | "avatarUrl">;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification extends Entity<{
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  recipientId: string;
  triggeredBy: string | null;
  entityId: string | null;
  entityType: string | null;
}> {}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}
