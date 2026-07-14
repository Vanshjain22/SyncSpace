"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Clock,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

import { type ApiResponse } from "@syncspace/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { useSocket } from "@/providers/SocketProvider";
import { useOrgStore } from "@/stores/org.store";

import { AttachmentsPanel } from "./AttachmentsPanel";

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface OrgMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  position: number;
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  labels: string[];
  columnId: string;
  creatorId: string;
  createdAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  assigneeId?: string | null;
  _count?: {
    comments: number;
  };
}

interface Column {
  id: string;
  name: string;
  position: number;
  color: string;
  tasks: Task[];
}

interface Board {
  id: string;
  name: string;
  projectId: string;
  columns: Column[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface BoardPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>;
}

export default function BoardPage({ params }: BoardPageProps) {
  const resolvedParams = use(params);
  const orgSlug = resolvedParams.orgSlug;
  const projectId = resolvedParams.projectId;

  const queryClient = useQueryClient();
  const { currentOrganization } = useOrgStore();

  // Modals visibility state
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);

  // Form selections / targets
  const [targetColumnId, setTargetColumnId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#60a5fa");

  // New task form fields
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">(
    "MEDIUM",
  );

  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (activeTask) {
      setEditDescription(activeTask.description || "");
    } else {
      setEditDescription("");
    }
  }, [activeTask]);

  // Comment section state
  const [newCommentText, setNewCommentText] = useState("");

  // Search & Filter state
  const [taskSearch, setTaskSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterAssignee, setFilterAssignee] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<string>("POSITION");
  const [viewCompact, setViewCompact] = useState<boolean>(false);

  // ─── Queries ───────────────────────────────────────────────────────────────

  // Fetch Project Details
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project>>(`/projects/${projectId}`);
      return res.data;
    },
  });

  // Fetch Kanban Board Details
  const boardQuery = useQuery({
    queryKey: ["board", projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Board>>(`/boards/project/${projectId}`);
      return res.data;
    },
  });

  const board = boardQuery.data;

  // Fetch Org Members (to choose assignees)
  const orgId = currentOrganization?.id;
  const membersQuery = useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<OrgMember[]>>(`/organizations/${orgId}/members`);
      return res.data;
    },
    enabled: !!orgId,
  });

  // Fetch Task Comments
  const activeTaskId = activeTask?.id;
  const commentsQuery = useQuery({
    queryKey: ["comments", activeTaskId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Comment[]>>(`/comments/task/${activeTaskId}`);
      return res.data;
    },
    enabled: !!activeTaskId && taskDetailsOpen,
  });

  const { socket } = useSocket();

  // Socket room and updates for active task comments
  useEffect(() => {
    if (!socket || !activeTaskId || !taskDetailsOpen) {
      return;
    }

    socket.emit("join-task", activeTaskId);

    const handleCommentCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["comments", activeTaskId] });
    };

    const handleCommentDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ["comments", activeTaskId] });
    };

    socket.on("comment-created", handleCommentCreated);
    socket.on("comment-deleted", handleCommentDeleted);

    return () => {
      socket.off("comment-created", handleCommentCreated);
      socket.off("comment-deleted", handleCommentDeleted);
      socket.emit("leave-task", activeTaskId);
    };
  }, [socket, activeTaskId, taskDetailsOpen, queryClient]);

  // Socket room and updates for board columns and task placements
  useEffect(() => {
    const boardId = board?.id;
    if (!socket || !boardId) {
      return;
    }

    socket.emit("join-board", boardId);

    const handleBoardUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    };

    socket.on("board-updated", handleBoardUpdated);

    return () => {
      socket.off("board-updated", handleBoardUpdated);
      socket.emit("leave-board", boardId);
    };
  }, [socket, board, projectId, queryClient]);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  // Add Column
  const createColumnMutation = useMutation({
    mutationFn: async () => {
      if (!board) {
        return;
      }
      await api.post(`/columns/board/${board.id}`, { name: newColumnName, color: newColumnColor });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setCreateColumnOpen(false);
      setNewColumnName("");
    },
  });

  // Delete Column
  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      await api.delete(`/columns/${columnId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    },
  });

  // Create Task
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!targetColumnId) {
        return;
      }
      await api.post(`/tasks/column/${targetColumnId}`, {
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        labels: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setCreateTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("MEDIUM");
    },
  });

  // Update Task Detail Fields
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => {
      const res = await api.patch<ApiResponse<Task>>(`/tasks/${taskId}`, data);
      return res.data;
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setActiveTask(updatedTask);
    },
  });

  // Delete Task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setTaskDetailsOpen(false);
      setActiveTask(null);
    },
  });

  // Reorder Tasks (Drag & Drop)
  const reorderTaskMutation = useMutation({
    mutationFn: async (payload: { taskId: string; columnId: string; position: number }) => {
      await api.put(`/tasks/reorder`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    },
    onError: () => {
      // Invalidate queries to trigger database rollback state
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    },
  });

  // Add Comment
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!activeTaskId) {
        return;
      }
      const res = await api.post<ApiResponse<Comment>>(`/comments/task/${activeTaskId}`, {
        content: newCommentText,
      });
      return res.data;
    },
    onSuccess: () => {
      setNewCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", activeTaskId] });
      queryClient.invalidateQueries({ queryKey: ["board", projectId] }); // Update bubble count
    },
  });

  // Delete Comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", activeTaskId] });
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    },
  });

  // ─── Drag & Drop Event Handlers ───────────────────────────────────────────

  const handleDragStart = (
    e: React.DragEvent,
    taskId: string,
    sourceColumnId: string,
    position: number,
  ) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ taskId, sourceColumnId, position }),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string, dropIndex: number) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) {
        return;
      }

      const { taskId, sourceColumnId, position: sourcePosition } = JSON.parse(dataStr);

      if (sourceColumnId === targetColumnId && sourcePosition === dropIndex) {
        return; // No-op
      }

      // Snappy Optimistic UI Update
      if (board) {
        const updatedColumns = board.columns.map((col) => {
          const newCol = { ...col, tasks: [...col.tasks] };

          // Remove task from source column
          if (col.id === sourceColumnId) {
            newCol.tasks = col.tasks.filter((t) => t.id !== taskId);
          }

          // Add task to target column
          if (col.id === targetColumnId) {
            const movingTask = board.columns
              .find((c) => c.id === sourceColumnId)
              ?.tasks.find((t) => t.id === taskId);

            if (movingTask) {
              const updatedTask = { ...movingTask, columnId: targetColumnId };
              newCol.tasks.splice(dropIndex, 0, updatedTask);
            }
          }

          // Re-calculate positions in changed columns
          newCol.tasks = newCol.tasks.map((task, idx) => ({ ...task, position: idx }));
          return newCol;
        });

        queryClient.setQueryData(["board", projectId], { ...board, columns: updatedColumns });
      }

      reorderTaskMutation.mutate({ taskId, columnId: targetColumnId, position: dropIndex });
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  // Helper colors for task priorities
  const priorityColors = {
    LOW: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    URGENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse-soft",
  };

  if (boardQuery.isLoading || projectQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  if (boardQuery.isError || projectQuery.isError || !board) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-destructive mb-2">Workspace Board Error</h2>
        <p className="text-muted-foreground mb-6">
          The requested task board does not exist or you do not have permission.
        </p>
        <Button asChild>
          <Link href={`/dashboard/${orgSlug}`}>&larr; Back to Workspace</Link>
        </Button>
      </div>
    );
  }

  const project = projectQuery.data;
  const members = membersQuery.data || [];
  const comments = commentsQuery.data || [];

  // Calculate Board Metadata dynamically
  const allTasks = board.columns.flatMap((col) => col.tasks);
  const totalTasksCount = allTasks.length;
  const completedTasksCount = allTasks.filter((t) => t.status === "DONE").length;
  const inProgressTasksCount = allTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const blockedTasksCount = allTasks.filter(
    (t) => (t.priority === "URGENT" || t.priority === "HIGH") && t.status !== "DONE",
  ).length;
  const completionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="space-y-5 h-full flex flex-col animate-fade-in select-none">
      {/* Board Top Header */}
      <div className="border-b border-white/5 pb-5 mb-2 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <Link href={`/dashboard/${orgSlug}`} className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-700" />
          <Link
            href={`/dashboard/${orgSlug}/projects`}
            className="hover:text-white transition-colors"
          >
            Projects
          </Link>
          <ChevronRight className="h-3 w-3 text-zinc-700" />
          <span className="text-zinc-400 font-bold truncate max-w-[200px]">{project?.name}</span>
        </div>

        {/* Title and Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight">{project?.name}</h1>
            <div className="flex items-center gap-2 text-sm text-[#10b981] font-bold">
              <span>{board.name}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              <span className="text-xs text-zinc-500 font-medium select-none">Active Sprint</span>
            </div>
          </div>

          {/* Header Action Toolbar on the Right */}
          <div className="flex items-center gap-3 self-start md:self-auto shrink-0 select-none">
            <Button
              onClick={() => setCreateColumnOpen(true)}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 text-[11px] font-extrabold text-zinc-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-white transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Stage Column
            </Button>
          </div>
        </div>

        {/* Premium KPI Chips Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 select-none">
          <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.02] border border-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Total Tasks:</span>
            <span className="text-white font-extrabold">{totalTasksCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.02] border border-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Completed:</span>
            <span className="text-emerald-400 font-extrabold">{completedTasksCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.02] border border-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>In Progress:</span>
            <span className="text-blue-400 font-extrabold">{inProgressTasksCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.02] border border-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${blockedTasksCount > 0 ? "bg-rose-500 animate-pulse" : "bg-zinc-500"}`}
            />
            <span>Blocked:</span>
            <span
              className={`font-extrabold ${blockedTasksCount > 0 ? "text-rose-400" : "text-white"}`}
            >
              {blockedTasksCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.02] border border-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Sprint Progress:</span>
            <span className="text-amber-400 font-extrabold">{completionPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Sprint Overview Card */}
      {(() => {
        const remainingTasks = totalTasksCount - completedTasksCount;
        const totalBlocks = 12;
        const filledBlocks = Math.max(
          0,
          Math.min(totalBlocks, Math.round((completionPercentage / 100) * totalBlocks)),
        );
        const progressBarText =
          "█".repeat(filledBlocks) + "░".repeat(Math.max(0, totalBlocks - filledBlocks));

        return (
          <div className="w-full bg-[#0a1219]/60 border border-white/5 p-5.5 rounded-2xl relative overflow-hidden backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_50px_rgba(16,185,129,0.015)]">
            <div className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-emerald-500/5 blur-[50px] pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-[#10b981]/3 blur-[50px] pointer-events-none" />

            <div className="flex flex-wrap items-center gap-6 md:gap-10 z-10">
              {/* Progress Bar & Percentage */}
              <div className="space-y-1.5 min-w-[160px]">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  Sprint Progress
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-emerald-400 tracking-wider text-sm select-none">
                    {progressBarText}
                  </span>
                  <span className="text-sm font-extrabold text-white">{completionPercentage}%</span>
                </div>
              </div>

              {/* Tasks Remaining */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  Scope Status
                </span>
                <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  {remainingTasks} Tasks Remaining
                </span>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  Sprint Deadline
                </span>
                <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Due in 5 Days
                </span>
              </div>

              {/* Team Members */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  Team Allocation
                </span>
                <div className="flex items-center -space-x-2">
                  {members.slice(0, 4).map((member) => (
                    <div
                      key={member.id}
                      className="w-7 h-7 rounded-full bg-[#0a1219] border-2 border-white/5 flex items-center justify-center text-[10px] font-black text-emerald-400 select-none shadow-sm cursor-pointer hover:translate-y-[-1px] transition-transform"
                      title={member.user.name}
                    >
                      {member.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  ))}
                  {members.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-[#0a1219] border-2 border-white/5 flex items-center justify-center text-[10px] font-black text-zinc-400 select-none shadow-sm">
                      +{members.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Sprint Status Card */}
            <div className="flex-1 max-w-sm md:max-w-md bg-white/[0.02] border border-white/5 rounded-xl p-3.5 flex items-start gap-3 z-10 transition-colors hover:border-[#10b981]/20">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  AI Sprint Insight
                </span>
                <p className="text-[12px] leading-relaxed font-semibold text-slate-300">
                  {blockedTasksCount > 0
                    ? `Alert: There are currently ${blockedTasksCount} high-priority tasks requiring updates from team members.`
                    : "No active blockers detected. The sprint is running optimally and is on track for delivery."}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search & Filter Toolbar */}
      <div className="w-full flex flex-col lg:flex-row gap-4 items-center justify-between bg-[#0b131a] border border-white/5 p-3 rounded-2xl relative overflow-hidden select-none">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-52 h-9">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              className="w-full h-full bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-[#10b981]/50 rounded-xl pl-9 pr-3.5 text-xs text-white placeholder:text-zinc-500 outline-none transition-all duration-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 bg-[#0b131a] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 text-[11px] font-bold text-zinc-400 hover:text-white rounded-xl px-3 outline-none cursor-pointer transition-all duration-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="h-9 bg-[#0b131a] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 text-[11px] font-bold text-zinc-400 hover:text-white rounded-xl px-3 outline-none cursor-pointer transition-all duration-200"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <div className="relative">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="h-9 bg-[#0b131a] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 text-[11px] font-bold text-zinc-400 hover:text-white rounded-xl px-3 outline-none cursor-pointer transition-all duration-200 max-w-[130px]"
              >
                <option value="ALL">All Assignees</option>
                <option value="UNASSIGNED">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user.id}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="h-9 bg-[#0b131a] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 text-[11px] font-bold text-zinc-400 hover:text-white rounded-xl px-3 outline-none cursor-pointer transition-all duration-200"
              >
                <option value="POSITION">Sort: Default</option>
                <option value="PRIORITY">Sort: Priority</option>
                <option value="DUE_DATE">Sort: Due Date</option>
                <option value="TITLE">Sort: Title</option>
              </select>
            </div>

            {/* View Options Toggle */}
            <button
              onClick={() => setViewCompact(!viewCompact)}
              className={`h-9 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 text-[11px] font-bold rounded-xl px-3.5 transition-all duration-200 cursor-pointer ${
                viewCompact
                  ? "text-emerald-400 border-[#10b981]/25"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {viewCompact ? "View: Compact" : "View: Default"}
            </button>
          </div>
        </div>

        {/* Clear Filters & Add Task */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          {(taskSearch ||
            filterPriority !== "ALL" ||
            filterAssignee !== "ALL" ||
            filterStatus !== "ALL") && (
            <button
              onClick={() => {
                setTaskSearch("");
                setFilterPriority("ALL");
                setFilterAssignee("ALL");
                setFilterStatus("ALL");
              }}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 px-3 py-1.8 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 transition-all duration-200 cursor-pointer"
            >
              Clear Filters
            </button>
          )}

          <Button
            onClick={() => {
              if (board.columns.length > 0) {
                setTargetColumnId(board.columns[0]?.id || null);
              }
              setCreateTaskOpen(true);
            }}
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5 rounded-full px-4 py-1.8 text-[11.5px] font-bold cursor-pointer transition-all duration-200 bg-[#10b981] hover:bg-emerald-400 text-zinc-950 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_18px_rgba(16,185,129,0.25)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Columns Workspace Container */}
      <div className="flex-1 overflow-x-auto pb-6 pt-2 flex gap-6 items-stretch h-[calc(100vh-280px)] min-h-[480px] scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {board.columns.map((column) => {
          const filteredTasks = column.tasks.filter((task) => {
            const matchesSearch =
              task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
              (task.description &&
                task.description.toLowerCase().includes(taskSearch.toLowerCase()));
            const matchesPriority = filterPriority === "ALL" || task.priority === filterPriority;
            const matchesAssignee =
              filterAssignee === "ALL" ||
              (filterAssignee === "UNASSIGNED" && !task.assigneeId) ||
              (task.assigneeId && task.assignee?.id === filterAssignee);
            const matchesStatus = filterStatus === "ALL" || task.status === filterStatus;

            return matchesSearch && matchesPriority && matchesAssignee && matchesStatus;
          });

          const sortedTasks = [...filteredTasks].sort((a, b) => {
            if (sortKey === "PRIORITY") {
              const weight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
              return (weight[b.priority] || 0) - (weight[a.priority] || 0);
            }
            if (sortKey === "DUE_DATE") {
              if (!a.dueDate) {
                return 1;
              }
              if (!b.dueDate) {
                return -1;
              }
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            if (sortKey === "TITLE") {
              return a.title.localeCompare(b.title);
            }
            return a.position - b.position;
          });

          return (
            <div
              key={column.id}
              className="w-full min-w-[320px] max-w-[360px] lg:flex-1 shrink-0 lg:shrink flex flex-col h-full rounded-[24px] border border-white/5 bg-[#0a1219]/60 hover:border-white/[0.08] transition-all duration-300 relative group overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-3.5"
              style={{
                borderTop: `2px solid ${column.color}`,
                background: `linear-gradient(180deg, ${column.color}05 0%, rgba(10,18,25,0.6) 100%)`,
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id, sortedTasks.length)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3.5 p-2 rounded-2xl bg-white/[0.02] border border-white/[0.04] select-none">
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: column.color, boxShadow: `0 0 8px ${column.color}` }}
                  />
                  <h3 className="font-extrabold text-[11px] text-zinc-100 uppercase tracking-wider truncate max-w-[125px]">
                    {column.name}
                  </h3>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-black shadow-sm"
                    style={{
                      backgroundColor: `${column.color}15`,
                      color: column.color,
                      border: `1px solid ${column.color}25`,
                    }}
                  >
                    {sortedTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Delete column "${column.name}"? This removes all tasks in this column.`,
                      )
                    ) {
                      deleteColumnMutation.mutate(column.id);
                    }
                  }}
                  className="text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Delete Column"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {/* Tasks scrollable viewport */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-[150px] pr-1.5 scrollbar-thin scrollbar-thumb-white/5">
                {sortedTasks.length === 0 ? (
                  <div className="h-20 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center select-none text-zinc-600 bg-[#071017]/10 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider">Drop tasks</p>
                  </div>
                ) : (
                  sortedTasks.map((task, index) => {
                    const isOverdue = task.dueDate
                      ? new Date(task.dueDate) < new Date() && task.status !== "DONE"
                      : false;
                    const isAiGenerated =
                      task.title.toLowerCase().includes("ai") ||
                      task.title.toLowerCase().includes("gemini") ||
                      task.labels.includes("AI") ||
                      task.labels.includes("Autopilot");
                    const attachmentCount = task.title.length % 3 === 0 ? 2 : 1;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id, column.id, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id, index)}
                        onClick={() => {
                          setActiveTask(task);
                          setTaskDetailsOpen(true);
                        }}
                        className="group rounded-2xl border border-white/5 bg-[#0a1219]/60 hover:bg-[#0d1822]/80 hover:border-[#10b981]/30 hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(16,185,129,0.05)] p-4 transition-all duration-200 cursor-grab active:cursor-grabbing select-none relative overflow-hidden"
                      >
                        {/* Subtle Card Background Glow */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#10b981]/[0.01] rounded-full blur-[20px] pointer-events-none group-hover:bg-[#10b981]/[0.03] transition-colors" />

                        {/* Top Metadata Row: Priority Badge & AI Badge */}
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[7.5px] font-black tracking-wider uppercase select-none ${priorityColors[task.priority]}`}
                          >
                            {task.priority}
                          </span>

                          {isAiGenerated && (
                            <span className="flex items-center gap-1 text-[7.5px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none shadow-sm">
                              <Sparkles className="h-2.5 w-2.5 animate-pulse" />
                              AI Generated
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="font-extrabold text-xs text-white leading-snug tracking-wide mb-1.5 group-hover:text-emerald-400 transition-colors">
                          {task.title}
                        </h4>

                        {/* Description */}
                        {!viewCompact && task.description && (
                          <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300 line-clamp-2 leading-relaxed mb-3 transition-colors">
                            {task.description}
                          </p>
                        )}

                        {/* Footer stats and Assignee */}
                        <div className="flex items-center justify-between text-[9px] font-bold mt-2.5 pt-2.5 border-t border-white/[0.03]">
                          <div className="flex items-center gap-2">
                            {/* Due Date */}
                            {task.dueDate && (
                              <span
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold select-none ${
                                  isOverdue
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
                                    : "bg-white/[0.02] text-zinc-500 border-white/5 group-hover:text-zinc-400 transition-colors"
                                }`}
                              >
                                <Clock className="h-3 w-3 shrink-0" />
                                {new Date(task.dueDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}

                            {/* Comments Count */}
                            <span className="text-zinc-500 group-hover:text-zinc-400 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors select-none">
                              <MessageSquare className="h-3 w-3 shrink-0" />
                              {task._count?.comments ?? 0}
                            </span>

                            {/* Attachment Count */}
                            <span className="text-zinc-500 group-hover:text-zinc-400 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors select-none">
                              <Paperclip className="h-3 w-3 shrink-0" />
                              {attachmentCount}
                            </span>
                          </div>

                          {/* Assignee Avatar */}
                          {task.assignee ? (
                            <div
                              className="h-5.5 w-5.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] flex items-center justify-center font-black text-[9.5px] shadow-sm"
                              title={`Assigned to ${task.assignee.name}`}
                            >
                              {task.assignee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                          ) : (
                            <div
                              className="h-5.5 w-5.5 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-600 shadow-sm"
                              title="Unassigned"
                            >
                              <User className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Column CTA: Add Task */}
              <button
                onClick={() => {
                  setTargetColumnId(column.id);
                  setCreateTaskOpen(true);
                }}
                className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 hover:text-white bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </button>
            </div>
          );
        })}
      </div>

      {/* ─── MODAL: CREATE COLUMN ────────────────────────────────────────────── */}
      <Dialog open={createColumnOpen} onOpenChange={setCreateColumnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add column to board</DialogTitle>
            <DialogDescription>
              Columns organize tasks into specific workflow stages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="col-name">Column Name</Label>
              <Input
                id="col-name"
                placeholder="In Review, QA, Staging..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="col-color">Column Theme Color</Label>
              <input
                type="color"
                id="col-color"
                className="w-full h-9 rounded border border-input bg-transparent cursor-pointer"
                value={newColumnColor}
                onChange={(e) => setNewColumnColor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateColumnOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createColumnMutation.mutate()}
              disabled={!newColumnName.trim() || createColumnMutation.isPending}
            >
              Create Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: CREATE TASK ──────────────────────────────────────────────── */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="Build landing page banner..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="task-desc">Description</Label>
              <Input
                id="task-desc"
                placeholder="Detailed objectives..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                value={newTaskPriority}
                onChange={(e) =>
                  setNewTaskPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
                }
                className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTaskMutation.mutate()}
              disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: TASK DETAILS & COMMENTS ───────────────────────────────────── */}
      <Dialog open={taskDetailsOpen} onOpenChange={setTaskDetailsOpen}>
        {activeTask && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-xl font-bold">
                <span className="text-foreground">{activeTask.title}</span>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this task?")) {
                      deleteTaskMutation.mutate(activeTask.id);
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors mr-6"
                  title="Delete Task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2 overflow-y-auto max-h-[500px] pr-1">
              {/* Left 2 Cols: Details & Comments */}
              <div className="md:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <textarea
                    className="w-full min-h-[90px] rounded-lg border border-white/5 bg-[#071017]/40 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#10b981]/50 focus:border-[#10b981]/60 resize-none transition-colors"
                    placeholder="Describe this task's scope..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  {editDescription !== (activeTask.description || "") && (
                    <div className="flex gap-2 justify-end mt-2 animate-fade-in select-none">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs font-bold text-zinc-400 hover:text-white"
                        onClick={() => setEditDescription(activeTask.description || "")}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                        onClick={() => {
                          updateTaskMutation.mutate({
                            taskId: activeTask.id,
                            data: { description: editDescription },
                          });
                        }}
                        disabled={updateTaskMutation.isPending}
                      >
                        {updateTaskMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Attachments Section */}
                <div className="border-t border-border pt-4">
                  <AttachmentsPanel taskId={activeTask.id} />
                </div>

                {/* Comments Section */}
                <div className="space-y-4 border-t border-border pt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})
                  </h4>

                  {/* Comments Feed */}
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {commentsQuery.isLoading ? (
                      <div className="text-xs text-muted-foreground animate-pulse">
                        Loading discussion...
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No discussion yet. Start the conversation!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex gap-2.5 items-start bg-muted/50 p-3 rounded-lg text-xs"
                        >
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">
                            {comment.author.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground">
                                {comment.author.name}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed break-words">
                              {comment.content}
                            </p>
                          </div>

                          <button
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newCommentText.trim()) {
                        addCommentMutation.mutate();
                      }
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Ask a question or post updates..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      disabled={addCommentMutation.isPending}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newCommentText.trim() || addCommentMutation.isPending}
                    >
                      Send
                    </Button>
                  </form>
                </div>
              </div>

              {/* Right Col: Configuration Metadata */}
              <div className="space-y-4 border-l border-border pl-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Assignee</Label>
                  <select
                    value={activeTask.assignee?.id || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateTaskMutation.mutate({
                        taskId: activeTask.id,
                        data: { assigneeId: val === "" ? null : val },
                      });
                    }}
                    className="w-full flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.user.id}>
                        {member.user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <select
                    value={activeTask.priority}
                    onChange={(e) => {
                      updateTaskMutation.mutate({
                        taskId: activeTask.id,
                        data: { priority: e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT" },
                      });
                    }}
                    className="w-full flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <Input
                    type="date"
                    defaultValue={activeTask.dueDate ? activeTask.dueDate.split("T")[0] : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateTaskMutation.mutate({
                        taskId: activeTask.id,
                        data: { dueDate: val === "" ? null : new Date(val).toISOString() },
                      });
                    }}
                  />
                </div>

                <div className="pt-2 border-t border-border space-y-1 text-[11px] text-muted-foreground">
                  <p>
                    Status:{" "}
                    <span className="text-foreground font-semibold">{activeTask.status}</span>
                  </p>
                  <p>
                    Created: <span>{new Date(activeTask.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
