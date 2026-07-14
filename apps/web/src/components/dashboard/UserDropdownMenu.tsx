"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  CreditCard,
  HelpCircle,
  Keyboard,
  Layers,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/providers/SocketProvider";
import { useOrgStore } from "@/stores/org.store";

interface UserDropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  align?: "top" | "bottom";
}

export function UserDropdownMenu({ isOpen, onClose, align = "bottom" }: UserDropdownMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { currentOrganization, organizations, setCurrentOrganization } = useOrgStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showWorkspaces, setShowWorkspaces] = useState(false);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
        setShowWorkspaces(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Escape key closes
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        setShowWorkspaces(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Reset internal states on open state change
  useEffect(() => {
    if (!isOpen) {
      setShowWorkspaces(false);
    }
  }, [isOpen]);

  if (!user) {
    return null;
  }

  const activeSlug = currentOrganization?.slug || organizations[0]?.slug;
  const profileUrl = activeSlug ? `/dashboard/${activeSlug}/settings?tab=profile` : "/dashboard";
  const workspaceUrl = activeSlug ? `/dashboard/${activeSlug}` : "/dashboard";
  const settingsUrl = activeSlug ? `/dashboard/${activeSlug}/settings?tab=general` : "/dashboard";
  const billingUrl = activeSlug ? `/dashboard/${activeSlug}/settings?tab=billing` : "/dashboard";

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const triggerKeyboardShortcuts = () => {
    onClose();
    window.dispatchEvent(new Event("open-keyboard-shortcuts"));
  };

  const handleHelpClick = () => {
    onClose();
    window.dispatchEvent(new Event("open-help-modal"));
  };

  const handleLogoutClick = () => {
    onClose();
    if (socket) {
      socket.disconnect();
    }
    logout();
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  const handleWorkspaceAction = () => {
    if (organizations.length > 1) {
      setShowWorkspaces(true);
    } else {
      onClose();
      router.push(settingsUrl);
    }
  };

  const menuItems = [
    {
      label: "My Profile",
      icon: User,
      action: () => {
        onClose();
        router.push(profileUrl);
      },
    },
    {
      label: "Dashboard",
      icon: BarChart3,
      action: () => {
        onClose();
        router.push(workspaceUrl);
      },
    },
    {
      label: "Workspace",
      icon: Layers,
      action: handleWorkspaceAction,
    },
    {
      label: "Settings",
      icon: Settings,
      action: () => {
        onClose();
        router.push(settingsUrl);
      },
    },
    {
      label: "Billing",
      icon: CreditCard,
      action: () => {
        onClose();
        router.push(billingUrl);
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.95, y: align === "bottom" ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: align === "bottom" ? 8 : -8 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`absolute ${
            align === "bottom" ? "top-full mt-2 right-0" : "bottom-full mb-2 left-0 right-0"
          } z-50 w-56 rounded-2xl border border-white/5 bg-[#0f1c25]/90 backdrop-blur-xl p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] select-none focus:outline-none`}
          role="menu"
          aria-label="User account actions"
        >
          {showWorkspaces ? (
            <div className="space-y-0.5 animate-fade-in">
              {/* Back header */}
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/5 mb-2 text-left">
                <button
                  onClick={() => setShowWorkspaces(false)}
                  className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>

              {/* Workspace list */}
              <div className="space-y-0.5 max-h-[160px] overflow-y-auto pr-1">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => {
                      onClose();
                      setCurrentOrganization(org);
                      router.push(`/dashboard/${org.slug}`);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-xl cursor-pointer transition-colors ${
                      org.id === currentOrganization?.id
                        ? "bg-white/5 font-extrabold text-white"
                        : ""
                    }`}
                  >
                    <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#10b981] text-[9px] font-bold shrink-0">
                      {org.name[0]?.toUpperCase()}
                    </div>
                    <span className="truncate">{org.name}</span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-white/5 my-2" />

              {/* Settings direct link */}
              <div
                onClick={() => {
                  onClose();
                  router.push(settingsUrl);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-[#10b981]/10 rounded-xl cursor-pointer transition-colors"
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Workspace Settings</span>
              </div>
            </div>
          ) : (
            <>
              {/* User header summary */}
              <div className="px-3.5 py-2.5 border-b border-white/5 mb-2 text-left">
                <span className="text-xs font-bold text-white block truncate">{user.name}</span>
                <span className="text-[10px] text-[#94a3b8] font-semibold block truncate mt-0.5">
                  {user.email}
                </span>
              </div>

              {/* Navigation options */}
              <div className="space-y-0.5">
                {menuItems.map((item, idx) => (
                  <div
                    key={idx}
                    tabIndex={0}
                    role="menuitem"
                    onClick={item.action}
                    onKeyDown={(e) => handleItemKeyDown(e, item.action)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-xl cursor-pointer transition-colors focus:bg-white/5 focus:text-white focus:outline-none"
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}

                {/* Theme Toggle option */}
                <div
                  tabIndex={0}
                  role="menuitem"
                  onClick={toggleTheme}
                  onKeyDown={(e) => handleItemKeyDown(e, toggleTheme)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-xl cursor-pointer transition-colors focus:bg-white/5 focus:text-white focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4 shrink-0 text-[#14b8a6]" />
                    ) : (
                      <Moon className="w-4 h-4 shrink-0" />
                    )}
                    <span>Theme Toggle</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-[#94a3b8]/60 bg-white/5 px-2 py-0.5 rounded font-bold">
                    {theme || "Dark"}
                  </span>
                </div>

                {/* Keyboard Shortcuts option */}
                <div
                  tabIndex={0}
                  role="menuitem"
                  onClick={triggerKeyboardShortcuts}
                  onKeyDown={(e) => handleItemKeyDown(e, triggerKeyboardShortcuts)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-xl cursor-pointer transition-colors focus:bg-white/5 focus:text-white focus:outline-none"
                >
                  <Keyboard className="w-4 h-4 shrink-0" />
                  <span>Keyboard Shortcuts</span>
                </div>

                {/* Help option */}
                <div
                  tabIndex={0}
                  role="menuitem"
                  onClick={handleHelpClick}
                  onKeyDown={(e) => handleItemKeyDown(e, handleHelpClick)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#94a3b8] hover:text-white hover:bg-white/5 rounded-xl cursor-pointer transition-colors focus:bg-white/5 focus:text-white focus:outline-none"
                >
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Help</span>
                </div>

                <div className="h-px bg-white/5 my-2" />

                {/* Sign Out option */}
                <div
                  tabIndex={0}
                  role="menuitem"
                  onClick={handleLogoutClick}
                  onKeyDown={(e) => handleItemKeyDown(e, handleLogoutClick)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-black text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-colors focus:bg-rose-500/10 focus:outline-none"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
