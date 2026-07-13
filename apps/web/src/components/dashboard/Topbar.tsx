"use client";

import Link from "next/link";
import * as React from "react";

import { Menu, Plus, Search } from "lucide-react";

import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserDropdownMenu } from "@/components/dashboard/UserDropdownMenu";
import { useAuth } from "@/hooks/useAuth";

import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";

interface TopbarProps {
  orgSlug?: string;
  orgName?: string;
  userInitials: string;
  onOpenMobileMenu: () => void;
}

export function Topbar({ orgSlug, orgName, userInitials, onOpenMobileMenu }: TopbarProps) {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5 bg-[#071017]/80 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-xl hover:bg-white/5 border border-white/5 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-4 h-4 text-white" />
        </button>

        {/* Breadcrumb path */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-[#94a3b8] font-bold tracking-wider uppercase">
            {orgName || "SyncSpace"}
          </span>
          <span className="text-zinc-600 font-bold px-1">/</span>
          <span className="font-bold text-white tracking-wider uppercase">Dashboard</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
          className="hidden sm:flex items-center justify-between h-8.5 w-[200px] px-3 rounded-xl border border-white/5 bg-[#0f1c25]/30 hover:bg-[#0f1c25]/60 hover:border-white/10 text-[#94a3b8] transition-all text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-950 border border-white/5 text-[9px] font-mono text-zinc-550/80">
            ⌘K
          </kbd>
        </button>

        <ThemeToggle className="hidden sm:inline-flex scale-90" />
        <NotificationDropdown />

        {/* Creation button */}
        {orgSlug && (
          <Button asChild variant="primary" size="sm" className="h-8.5 text-xs font-bold shadow-sm">
            <Link href={`/dashboard/${orgSlug}/projects/new`}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Project
            </Link>
          </Button>
        )}

        {/* Profile Avatar indicator */}
        <div className="relative ml-1.5 shrink-0">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title={user?.name || "User Avatar"}
            className="focus:outline-none cursor-pointer flex items-center justify-center rounded-full hover:ring-2 hover:ring-[#10b981]/50 transition-all"
          >
            <Avatar
              name={userInitials}
              size="sm"
              className="border-[#10b981]/25 text-[#10b981] h-8 w-8 text-[10px] font-extrabold"
            />
          </button>
          <UserDropdownMenu
            isOpen={dropdownOpen}
            onClose={() => setDropdownOpen(false)}
            align="bottom"
          />
        </div>
      </div>
    </header>
  );
}
