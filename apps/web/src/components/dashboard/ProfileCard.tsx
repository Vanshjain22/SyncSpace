"use client";

import * as React from "react";

import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";

interface ProfileCardProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
  onClick?: () => void;
  collapsed?: boolean;
}

export function ProfileCard({
  name,
  email,
  avatarUrl,
  onClick,
  collapsed = false,
}: ProfileCardProps) {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center justify-center p-2.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group relative"
        title="Account actions"
      >
        <Avatar
          src={avatarUrl}
          name={name}
          className="h-8 w-8 text-xs font-extrabold transition-opacity duration-200"
        />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl p-3 border border-white/5 bg-[#0b1620]/40 hover:bg-[#0b1620]/80 transition-all text-left justify-between cursor-pointer focus:outline-none"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar src={avatarUrl} name={name} className="h-8 w-8 text-xs font-extrabold" />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-bold text-white truncate block">{name}</span>
            <Badge variant="success" className="text-[9px] py-0 px-2 shrink-0 scale-90">
              Pro
            </Badge>
          </div>
          <span className="text-xs text-[#94a3b8] truncate block mt-0.5">{email}</span>
        </div>
      </div>
    </button>
  );
}
