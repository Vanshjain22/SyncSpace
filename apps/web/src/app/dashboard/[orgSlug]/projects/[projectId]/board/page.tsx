"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Plus,
  Search,
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
  const completionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="space-y-5 h-full flex flex-col animate-fade-in select-none">
      {/* Board Top Header */}
      <div className="border-b border-white/5 pb-4 mb-2 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={`/dashboard/${orgSlug}`}
            className="hover:text-white flex items-center gap-1 transition-colors group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
            <span>Dashboard</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
          <Link
            href={`/dashboard/${orgSlug}/projects`}
            className="hover:text-white transition-colors"
          >
            <span>Projects</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
          <span className="text-zinc-300 font-bold truncate max-w-[150px]">{project?.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">
              {board.name}
            </h1>
            {/* Board Metadata Row */}
            <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500 mt-2 select-none">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                {totalTasksCount} Total Tasks
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {completedTasksCount} Completed Tasks
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {completionPercentage}% Done
              </span>
            </div>
          </div>
          <Button
            onClick={() => setCreateColumnOpen(true)}
            variant="primary"
            size="md"
            className="shrink-0 self-start md:self-auto cursor-pointer shadow-md"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Stage Column
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-[#0f1c25]/60 border border-white/5 p-4 rounded-2xl backdrop-blur-xl">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            className="w-full bg-[#071017]/40 border border-white/5 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-[#94a3b8]/50 outline-none focus:border-[#10b981]/60 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Priority:
            </span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-[#0f1c25] border border-white/5 text-xs font-bold text-[#94a3b8] rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-[#10b981]/60 transition-colors"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Assignee:
            </span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-[#0f1c25] border border-white/5 text-xs font-bold text-[#94a3b8] rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-[#10b981]/60 transition-colors"
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

          {/* Active Filters Info and Clear Actions */}
          {(taskSearch || filterPriority !== "ALL" || filterAssignee !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTaskSearch("");
                setFilterPriority("ALL");
                setFilterAssignee("ALL");
              }}
              className="text-xs h-9 px-3 font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Columns Workspace Container */}
      <div className="flex-1 overflow-x-auto pb-6 pt-2 flex gap-5 items-start h-[calc(100vh-250px)] min-h-[450px] scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
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

            return matchesSearch && matchesPriority && matchesAssignee;
          });

          return (
            <div
              key={column.id}
              className="w-[320px] sm:w-[340px] shrink-0 flex flex-col max-h-full rounded-2xl border border-white/5 bg-[#0f1c25]/45 hover:bg-[#0f1c25]/60 hover:border-white/10 transition-all duration-300 p-4 relative group"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id, filteredTasks.length)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5 select-none">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider truncate max-w-[180px]">
                    {column.name}
                  </h3>
                  <span className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-bold">
                    {filteredTasks.length}
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
                  className="text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer animate-fade-in"
                  title="Delete Column"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Tasks scrollable viewport */}
              <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[150px] pr-1.5 scrollbar-thin scrollbar-thumb-white/5">
                {filteredTasks.length === 0 ? (
                  <div className="h-28 rounded-xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center select-none text-zinc-600 bg-[#071017]/10 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider">
                      Drop tasks here
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task, index) => {
                    const isOverdue = task.dueDate
                      ? new Date(task.dueDate) < new Date() && task.status !== "DONE"
                      : false;

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
                        className="group rounded-xl border border-white/5 bg-[#071017]/40 hover:bg-[#071017]/80 hover:border-emerald-500/30 hover:shadow-lg p-3.5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none"
                      >
                        <h4 className="font-extrabold text-xs text-white leading-snug tracking-wide mb-1.5 group-hover:text-emerald-400 transition-colors">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-[11px] text-[#94a3b8] line-clamp-2 leading-relaxed mb-3">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[9px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded-md border text-[8px] tracking-wider uppercase ${priorityColors[task.priority]}`}
                            >
                              {task.priority}
                            </span>

                            {task.dueDate && (
                              <span
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border ${isOverdue ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse" : "bg-white/5 text-zinc-400 border-white/5"}`}
                              >
                                <Clock className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}

                            {task._count && task._count.comments > 0 && (
                              <span className="text-zinc-500 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <MessageSquare className="h-3 w-3" />
                                {task._count.comments}
                              </span>
                            )}
                          </div>

                          {task.assignee ? (
                            <div
                              className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] flex items-center justify-center font-black text-[9px]"
                              title={`Assigned to ${task.assignee.name}`}
                            >
                              {task.assignee.name[0]?.toUpperCase()}
                            </div>
                          ) : (
                            <div
                              className="h-5 w-5 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-600"
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
