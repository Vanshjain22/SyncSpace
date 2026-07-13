"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ className, src, name, size = "md", ...props }: AvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const sizeClasses = {
    sm: "w-6 h-6 text-[9px]",
    md: "w-8 h-8 text-[11px]",
    lg: "w-10 h-10 text-[13px]",
  };

  const bgColors = [
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ];

  // Pick background based on name hash for consistency
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = bgColors[hash % bgColors.length];

  return (
    <div
      className={cn(
        "rounded-full border flex items-center justify-center font-extrabold shrink-0 overflow-hidden select-none bg-zinc-800",
        sizeClasses[size],
        !src && colorClass,
        className,
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
