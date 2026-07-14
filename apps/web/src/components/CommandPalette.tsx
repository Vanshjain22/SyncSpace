"use client";

import { type ApiResponse } from "@syncspace/shared";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api-client";
import { useOrgStore } from "@/stores/org.store";

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
}

interface SearchTaskResult {
  id: string;
  title: string;
  status: string;
  column: {
    id: string;
    name: string;
    board: {
      project: {
        id: string;
        name: string;
      };
    };
  };
}

export function CommandPalette() {
  const router = useRouter();
  const { currentOrganization } = useOrgStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const orgId = currentOrganization?.id;
  const orgSlug = currentOrganization?.slug;

  // 1. Fetch organization projects
  const { data: projects = [] } = useQuery({
    queryKey: ["command-palette-projects", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project[]>>(`/projects/org/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
  });

  // 2. Fetch tasks matching query
  const { data: tasks = [] } = useQuery({
    queryKey: ["command-palette-tasks", orgId, query],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SearchTaskResult[]>>(
        `/search/org/${orgId}?q=${encodeURIComponent(query)}`,
      );
      return res.data;
    },
    enabled: !!orgId && query.length >= 2,
  });

  // 3. Listen to global custom events
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((open) => !open);
    };
    const handleOpenTrigger = () => {
      setIsOpen(true);
    };
    const handleCloseAll = () => {
      setIsOpen(false);
    };

    window.addEventListener("toggle-command-palette", handleToggle);
    window.addEventListener("open-command-palette", handleOpenTrigger);
    window.addEventListener("close-all-modals", handleCloseAll);

    return () => {
      window.removeEventListener("toggle-command-palette", handleToggle);
      window.removeEventListener("open-command-palette", handleOpenTrigger);
      window.removeEventListener("close-all-modals", handleCloseAll);
    };
  }, []);

  // 5. Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setQuery("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Formulate items lists
  const staticActions = orgSlug
    ? [
        {
          id: "nav-dash",
          title: "Go to Dashboard",
          subtitle: "Workspace main overview",
          icon: <LayoutDashboard className="h-4 w-4" />,
          action: () => router.push(`/dashboard/${orgSlug}`),
        },
        {
          id: "nav-analytics",
          title: "View Analytics",
          subtitle: "Task status and completion metrics",
          icon: <BarChart3 className="h-4 w-4" />,
          action: () => router.push(`/dashboard/${orgSlug}/analytics`),
        },
        {
          id: "nav-settings",
          title: "Workspace Settings",
          subtitle: "Members, invites, and preferences",
          icon: <Settings className="h-4 w-4" />,
          action: () => router.push(`/dashboard/${orgSlug}/settings`),
        },
        {
          id: "action-new-project",
          title: "Create New Project",
          subtitle: "Start a new Kanban project",
          icon: <Plus className="h-4 w-4" />,
          action: () => router.push(`/dashboard/${orgSlug}/projects/new`),
        },
      ]
    : [];

  const filteredProjects = projects
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    .map((p) => ({
      id: `project-${p.id}`,
      title: p.name,
      subtitle: p.description || "Kanban project",
      icon: <FolderKanban className="h-4 w-4" />,
      action: () => router.push(`/dashboard/${orgSlug}/projects/${p.id}/board`),
    }));

  const taskResults = tasks.map((t) => ({
    id: `task-${t.id}`,
    title: t.title,
    subtitle: `${t.status} · ${t.column.board.project.name}`,
    icon: <FileText className="h-4 w-4" />,
    action: () => router.push(`/dashboard/${orgSlug}/projects/${t.column.board.project.id}/board`),
  }));

  const combinedItems = [...staticActions, ...filteredProjects, ...taskResults];

  // 6. Handle arrows key list navigations
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleListKeys = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % combinedItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + combinedItems.length) % combinedItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = combinedItems[activeIndex];
        if (selected) {
          selected.action();
          setIsOpen(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleListKeys);
    return () => window.removeEventListener("keydown", handleListKeys);
  }, [isOpen, activeIndex, combinedItems]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-popover shadow-dropdown overflow-hidden flex flex-col max-h-[420px] animate-scale-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, tasks, or actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder-muted-foreground/60 focus:ring-0"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="command-palette-options"
            aria-autocomplete="list"
            aria-label="Search actions, projects, and tasks"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground border border-border/50 font-mono">
            ESC
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5" role="listbox" id="command-palette-options">
          {combinedItems.length === 0 ? (
            <div className="p-8 text-center" role="presentation">
              <p className="text-sm text-muted-foreground">No results found.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              {/* Section: Actions */}
              {staticActions.length > 0 && query.length < 2 && (
                <p
                  className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider"
                  role="presentation"
                >
                  Actions
                </p>
              )}

              {combinedItems.map((item, index) => {
                const isSelected = index === activeIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left ${
                      isSelected
                        ? "bg-accent text-foreground"
                        : "text-foreground hover:bg-accent/60"
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground/60 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 font-mono">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 font-mono">
                ↵
              </kbd>{" "}
              Select
            </span>
          </div>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
