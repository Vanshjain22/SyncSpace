"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  CheckCircle,
  ChevronDown,
  FolderKanban,
  HelpCircle,
  Home,
  LayoutGrid,
  ListTodo,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { type ApiResponse } from "@syncspace/shared";

import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import { ProfileCard } from "./ProfileCard";
import { UserDropdownMenu } from "./UserDropdownMenu";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

interface SidebarProps {
  currentOrg?: Organization | null;
  organizations: Organization[];
  onOrgChange: (org: Organization) => void;
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  onLogout: () => void;
  isLoadingOrgs?: boolean;
  onItemClick?: () => void;
}

export function Sidebar({
  currentOrg,
  organizations,
  onOrgChange,
  userName,
  userEmail,
  userAvatar,
  onLogout,
  isLoadingOrgs = false,
  onItemClick,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  interface SidebarProject {
    id: string;
    name: string;
  }

  // Fetch projects inside Sidebar to dynamically link to the first active board for "Create Task"
  const { data: projects = [] } = useQuery({
    queryKey: ["sidebar-projects", currentOrg?.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SidebarProject[]>>(`/projects/org/${currentOrg?.id}`);
      return res.data;
    },
    enabled: !!currentOrg?.id,
  });

  const isActive = (path: string) => {
    if (!currentOrg) {
      return false;
    }
    const fullPath = `/dashboard/${currentOrg.slug}${path}`;
    if (path === "") {
      return pathname === fullPath || pathname === `/dashboard/${currentOrg.slug}`;
    }
    return pathname.startsWith(fullPath);
  };

  const mainNavItems = [
    { icon: Home, label: "Overview", path: "" },
    { icon: ListTodo, label: "My Tasks", path: "/tasks" },
    { icon: LayoutGrid, label: "Board", path: "/boards" },
    { icon: FolderKanban, label: "Projects", path: "/projects" },
    {
      icon: Plus,
      label: "Create Task",
      path: projects.length > 0 ? `/projects/${projects[0]?.id}/board` : `/projects/new`,
      badge: "Ctrl + T",
    },
    { icon: Users, label: "Invite Member", path: "/settings" },
    { icon: Users, label: "Team Members", path: "/settings" },
    { icon: CheckCircle, label: "Completed Tasks", path: "/analytics" },
    { icon: BarChart3, label: "Productivity", path: "/analytics" },
    { icon: Sparkles, label: "AI Assistant", path: "/ai-report" },
  ];

  const secondaryNavItems = [
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: Bell, label: "Notifications", path: "/settings", badge: "3" },
    {
      icon: HelpCircle,
      label: "Help & Support",
      path: "#",
      action: (e: React.MouseEvent) => {
        e.preventDefault();
        window.dispatchEvent(new Event("open-help-modal"));
      },
    },
  ];

  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <aside className="h-screen w-[260px] flex flex-col justify-between p-4 bg-[#08111a] border-r border-white/5 transition-all duration-300 relative select-none shrink-0 z-30">
      <div className="space-y-6 flex flex-col flex-1 min-h-0">
        {/* Logo and Brand Header */}
        <div className="flex items-center gap-2.5 px-3 py-1 select-none">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
            <svg
              className="w-4.5 h-4.5 text-zinc-950 font-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-extrabold text-base text-white tracking-tight uppercase">
            SyncSpace
          </span>
        </div>

        {/* Workspace selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between rounded-xl px-3 py-2 border border-white/5 bg-[#0b1622]/40 hover:bg-[#0b1622]/80 transition-colors text-left cursor-pointer focus:outline-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#10b981] text-xs font-black shrink-0">
                {currentOrg?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-grow min-w-0">
                <span className="text-xs font-black text-white truncate block uppercase tracking-wider">
                  {isLoadingOrgs ? "Loading..." : currentOrg?.name || "Workspace"}
                </span>
                <span className="text-[9px] font-bold text-emerald-400 block mt-0.5 tracking-widest uppercase">
                  Pro Plan
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-white/5 bg-[#0f1c25] shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-1.5 animate-scale-in">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    onOrgChange(org);
                    setDropdownOpen(false);
                    handleItemClick();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer",
                    org.slug === currentOrg?.slug && "bg-white/5 font-semibold text-white",
                  )}
                >
                  <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-[#10b981] text-[10px] font-bold">
                    {org.name[0]?.toUpperCase()}
                  </div>
                  <span className="truncate font-medium">{org.name}</span>
                </button>
              ))}
              <div className="h-px bg-white/5 my-1.5" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push("/orgs/new");
                  handleItemClick();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-emerald-400 hover:bg-white/5 transition-colors text-left font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create workspace
              </button>
              <div className="h-px bg-white/5 my-1.5" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                  handleItemClick();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-rose-400 hover:bg-white/5 transition-colors text-left font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto scrollbar-hidden space-y-6">
          <div className="space-y-6">
            {/* Main Section */}
            <div className="space-y-1">
              <span className="px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2.5 select-none">
                Main Navigation
              </span>
              <nav className="space-y-1">
                {currentOrg ? (
                  mainNavItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.label}
                        href={
                          item.path.startsWith("#")
                            ? item.path
                            : `/dashboard/${currentOrg.slug}${item.path}`
                        }
                        onClick={handleItemClick}
                        className={cn(
                          "h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium tracking-wide transition-all duration-150 border border-transparent group cursor-pointer",
                          active
                            ? "bg-emerald-500/10 text-white border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.04)]"
                            : "text-[#94a3b8] hover:text-white hover:bg-white/5",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors duration-150",
                              active ? "text-emerald-400" : "text-[#94a3b8] group-hover:text-white",
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[8px] font-mono px-1 py-0.2 rounded border transition-colors",
                              active
                                ? "bg-zinc-950 border-emerald-500/20 text-[#10b981]"
                                : "bg-zinc-950/50 border-white/5 text-zinc-500 group-hover:text-emerald-400 group-hover:border-emerald-500/20",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-500 italic px-3">Select workspace</p>
                )}
              </nav>
            </div>

            {/* Secondary Section */}
            <div className="space-y-1 pt-2">
              <span className="px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2.5 select-none">
                Secondary Navigation
              </span>
              <nav className="space-y-1">
                {currentOrg ? (
                  secondaryNavItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.label}
                        href={
                          item.path.startsWith("#")
                            ? item.path
                            : `/dashboard/${currentOrg.slug}${item.path}`
                        }
                        onClick={(e) => {
                          if (item.action) {
                            item.action(e);
                          }
                          handleItemClick();
                        }}
                        className={cn(
                          "h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium tracking-wide border border-transparent transition-all duration-150 group cursor-pointer",
                          active
                            ? "bg-emerald-500/10 text-white border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.04)]"
                            : "text-[#94a3b8] hover:text-white hover:bg-white/5",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors duration-150",
                              active ? "text-emerald-400" : "text-[#94a3b8] group-hover:text-white",
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="w-4 h-4 text-[9px] font-bold text-zinc-950 bg-[#10b981] flex items-center justify-center rounded-full shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-500 italic px-3">Select workspace</p>
                )}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom User Area */}
      <div className="pt-4 border-t border-white/5 relative">
        <ProfileCard
          name={userName}
          email={userEmail}
          avatarUrl={userAvatar}
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          collapsed={false}
        />
        <UserDropdownMenu
          isOpen={profileDropdownOpen}
          onClose={() => setProfileDropdownOpen(false)}
          align="top"
        />
      </div>
    </aside>
  );
}
