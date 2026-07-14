"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ApiResponse } from "@syncspace/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Edit3, ExternalLink, FolderPlus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useOrgStore } from "@/stores/org.store";

const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(100).trim(),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional()
    .or(z.literal("")),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  coverColor: string | null;
  createdAt: string;
  progress?: number;
}

interface ProjectsListClientProps {
  paramsPromise: Promise<{ orgSlug: string }>;
}

export function ProjectsListClient({ paramsPromise }: ProjectsListClientProps) {
  const params = use(paramsPromise);
  const orgSlug = params.orgSlug;

  const queryClient = useQueryClient();
  const { currentOrganization } = useOrgStore();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "progress">("date");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const orgId = currentOrganization?.id;

  // 1. Fetch organization projects
  const {
    data: projects = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project[]>>(`/projects/org/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
  });

  // Edit Project Mutation
  const editForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const editMutation = useMutation({
    mutationFn: async (payload: ProjectFormValues) => {
      if (!editingProject) {
        return;
      }
      const res = await api.patch<ApiResponse<Project>>(`/projects/${editingProject.id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
      queryClient.invalidateQueries({ queryKey: ["org-stats", orgId] });
      setEditingProject(null);
      editForm.reset();
    },
    onError: (err) => {
      setErrorMsg(getApiErrorMessage(err));
    },
  });

  // Delete Project Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingProject) {
        return;
      }
      const res = await api.delete<ApiResponse<unknown>>(`/projects/${deletingProject.id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
      queryClient.invalidateQueries({ queryKey: ["org-stats", orgId] });
      setDeletingProject(null);
    },
    onError: (err) => {
      setErrorMsg(getApiErrorMessage(err));
    },
  });

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    editForm.setValue("name", project.name);
    editForm.setValue("description", project.description || "");
  };

  const handleEditSubmit = (values: ProjectFormValues) => {
    setErrorMsg(null);
    editMutation.mutate(values);
  };

  // Filter and Sort Logic
  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())),
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "progress") {
      return (b.progress || 0) - (a.progress || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getGradient = (index: number) => {
    const gradients = [
      "from-cyan-500 to-blue-500",
      "from-emerald-500 to-teal-500",
      "from-rose-500 to-orange-500",
      "from-amber-500 to-yellow-500",
      "from-pink-500 to-rose-500",
    ];
    return gradients[index % gradients.length];
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-zinc-500 animate-pulse">
          Fetching projects...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <h3 className="text-base font-bold text-red-500">Failed to load projects</h3>
        <p className="text-xs text-zinc-400 mt-2">
          An error occurred while loading projects for this organization.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">
            Workspace Projects
          </h1>
          <p className="text-xs text-[#94a3b8] font-bold mt-1">
            Manage and monitor progress across your Kanban workspaces.
          </p>
        </div>
        <Button asChild variant="primary" className="shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <Link href={`/dashboard/${orgSlug}/projects/new`}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {errorMsg && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#071017]/40 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#94a3b8]/50 outline-none focus:border-[#10b981]/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ArrowUpDown className="w-4 h-4 text-zinc-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "date" | "progress")}
            className="bg-[#0f1c25] border border-white/5 text-xs font-bold text-[#94a3b8] rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-[#10b981]/60 transition-colors"
          >
            <option value="date">Sort by Date Created</option>
            <option value="name">Sort by Name</option>
            <option value="progress">Sort by Progress</option>
          </select>
        </div>
      </div>

      {/* Projects List Grid */}
      {sortedProjects.length === 0 ? (
        <Card className="p-12 text-center max-w-md mx-auto">
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">
            No projects found
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Create a new project or adjust your search keywords.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedProjects.map((project, index) => {
            const progress = project.progress ?? 0;
            const gradClass = getGradient(index);

            return (
              <Card
                key={project.id}
                className="p-5 flex flex-col justify-between hover:shadow-[0_0_35px_rgba(16,185,129,0.15)] hover:border-emerald-500/20 transition-all duration-300 relative group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] flex items-center justify-center font-extrabold text-base">
                      {project.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(project)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                        title="Edit Project"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingProject(project)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <Link
                      href={`/dashboard/${orgSlug}/projects/${project.id}/board`}
                      className="text-base font-black text-white hover:text-[#10b981] transition-colors block truncate uppercase tracking-wider"
                    >
                      {project.name}
                    </Link>
                    <p className="text-xs text-[#94a3b8]/70 mt-1 line-clamp-2 h-8 leading-relaxed">
                      {project.description || "No project description provided."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94a3b8] font-bold">Progress</span>
                    <span className="text-white font-extrabold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" indicatorClassName={gradClass} />

                  <div className="flex items-center justify-between text-[10px] text-[#94a3b8]/60 pt-1 font-bold">
                    <span>
                      Created:{" "}
                      {new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <Link
                      href={`/dashboard/${orgSlug}/projects/${project.id}/board`}
                      className="flex items-center gap-1 text-[#10b981] hover:underline"
                    >
                      Open Board <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Project Dialog Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1c25] p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingProject(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">
              Edit Project Info
            </h3>

            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-[#94a3b8]">
                        Project Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-zinc-950 border-white/10 focus:border-[#10b981]/60"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-[#94a3b8]">
                        Description
                      </FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          className="w-full rounded-xl bg-zinc-950 border border-white/10 p-3 text-sm text-white placeholder:text-[#94a3b8]/40 outline-none focus:border-[#10b981]/60 transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setEditingProject(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={editMutation.isPending}>
                    {editMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}

      {/* Delete Project Dialog Modal */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1c25] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2">
              Delete Project
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Are you sure you want to delete{" "}
              <span className="font-extrabold text-white">"{deletingProject.name}"</span>? This
              action will permanently remove all tasks and columns associated with it.
            </p>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeletingProject(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
