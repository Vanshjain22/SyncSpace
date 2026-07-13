"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Calendar, ExternalLink, ListTodo, Search, User } from "lucide-react";

import { type ApiResponse } from "@syncspace/shared";

import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useOrgStore } from "@/stores/org.store";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  dueDate: string | null;
  createdAt: string;
  projectName: string;
  projectId: string;
  columnName: string;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}

interface TasksListClientProps {
  paramsPromise: Promise<{ orgSlug: string }>;
}

export function TasksListClient({ paramsPromise }: TasksListClientProps) {
  const params = use(paramsPromise);
  const orgSlug = params.orgSlug;

  const { currentOrganization } = useOrgStore();
  const orgId = currentOrganization?.id;

  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") || "ALL").toUpperCase();

  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"title" | "date" | "priority">("date");

  // Fetch all tasks in the organization
  const {
    data: tasks = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["org-tasks", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Task[]>>(`/tasks/org/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
  });

  // Extract unique projects to filter by
  const uniqueProjects = Array.from(new Set(tasks.map((t) => t.projectName)));

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(search.toLowerCase()));

    const matchesPriority = filterPriority === "ALL" || task.priority === filterPriority;
    const matchesStatus = filterStatus === "ALL" || task.status === filterStatus;
    const matchesProject = filterProject === "ALL" || task.projectName === filterProject;

    return matchesSearch && matchesPriority && matchesStatus && matchesProject;
  });

  // Sort Tasks
  const priorityWeight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "priority") {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const priorityColors = {
    LOW: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    MEDIUM: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    URGENT: "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse-soft",
  };

  const statusLabels = {
    BACKLOG: "Backlog",
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    DONE: "Done",
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-zinc-500 animate-pulse">
          Fetching workspace tasks...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <h3 className="text-base font-bold text-red-500">Failed to load tasks</h3>
        <p className="text-xs text-zinc-400 mt-2">
          An error occurred while loading tasks for this organization.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <ListTodo className="w-6 h-6 text-emerald-500" />
          Workspace Tasks
        </h1>
        <p className="text-xs text-[#94a3b8] font-bold mt-1">
          Review, search, and manage all active tasks assigned within this workspace.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#071017]/40 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#94a3b8]/50 outline-none focus:border-[#10b981]/60 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto shrink-0 justify-end">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-[#0f1c25] border border-white/5 text-xs font-bold text-[#94a3b8] rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-[#10b981]/60 transition-colors"
          >
            <option value="ALL">All Projects</option>
            {uniqueProjects.map((proj) => (
              <option key={proj} value={proj}>
                {proj}
              </option>
            ))}
          </select>

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

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0f1c25] border border-white/5 text-xs font-bold text-[#94a3b8] rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-[#10b981]/60 transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>

          <div className="flex items-center gap-1 bg-[#0f1c25] border border-white/5 rounded-xl px-2.5 py-2 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "title" | "date" | "priority")}
              className="bg-transparent text-xs font-bold text-[#94a3b8] outline-none cursor-pointer"
            >
              <option value="date">Newest</option>
              <option value="title">Title</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table/List rendering */}
      {sortedTasks.length === 0 ? (
        <Card className="p-12 text-center max-w-md mx-auto">
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">No tasks found</p>
          <p className="text-xs text-zinc-600 mt-2">
            No matching tasks found. Adjust search terms or creation variables.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0f1c25]/30">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[#94a3b8] font-bold uppercase tracking-wider bg-white/5">
                <th className="py-3.5 px-4">Task Details</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Workflow Status</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Assignee</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white">
              {sortedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 max-w-xs">
                    <span className="font-bold text-sm text-white block truncate">
                      {task.title}
                    </span>
                    <span className="text-[11px] text-zinc-400 block truncate mt-0.5">
                      {task.description || "No description provided."}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-zinc-300">{task.projectName}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      {statusLabels[task.status]}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded font-medium border text-[10px] ${priorityColors[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {task.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px]">
                          {task.assignee.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-bold text-zinc-300">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 font-semibold italic flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Unassigned
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-zinc-400">
                    {task.dueDate ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/dashboard/${orgSlug}/projects/${task.projectId}/board`}
                      className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-400 font-bold hover:underline"
                    >
                      Open Board <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
