"use client";

import { type ApiResponse } from "@syncspace/shared";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LayoutGrid, Search } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useOrgStore } from "@/stores/org.store";

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  createdAt: string;
  progress?: number;
}

interface BoardsListClientProps {
  paramsPromise: Promise<{ orgSlug: string }>;
}

export function BoardsListClient({ paramsPromise }: BoardsListClientProps) {
  const params = use(paramsPromise);
  const orgSlug = params.orgSlug;

  const { currentOrganization } = useOrgStore();
  const orgId = currentOrganization?.id;

  const [search, setSearch] = useState("");

  // Fetch all organization projects
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

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())),
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-zinc-500 animate-pulse">
          Fetching workspace boards...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <h3 className="text-base font-bold text-red-500">Failed to load boards</h3>
        <p className="text-xs text-zinc-400 mt-2">
          An error occurred while loading projects for this organization.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-emerald-500" />
          Workspace Boards
        </h1>
        <p className="text-xs text-[#94a3b8] font-bold mt-1">
          Access the default Kanban boards for all active projects inside this workspace.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#071017]/40 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#94a3b8]/50 outline-none focus:border-[#10b981]/60 transition-colors"
          />
        </div>
      </div>

      {/* Boards Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center max-w-md mx-auto">
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">
            No boards found
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            No projects/boards were found in this organization matching your query.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((proj) => (
            <Card
              key={proj.id}
              className="p-5 flex flex-col justify-between hover:shadow-[0_0_35px_rgba(16,185,129,0.15)] hover:border-emerald-500/20 transition-all duration-300 group"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] flex items-center justify-center font-extrabold text-base">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {proj.name} Board
                  </h3>
                  <p className="text-xs text-[#94a3b8]/70 mt-1 line-clamp-2 h-8 leading-relaxed">
                    {proj.description || "Active project board workspace."}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-[#94a3b8]/60 font-bold">
                <span>Progress: {proj.progress ?? 0}%</span>
                <Link
                  href={`/dashboard/${orgSlug}/projects/${proj.id}/board`}
                  className="flex items-center gap-1 text-[#10b981] hover:underline"
                >
                  Open Kanban Board <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
