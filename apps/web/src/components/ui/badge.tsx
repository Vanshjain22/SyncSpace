"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "default";
  children: React.ReactNode;
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-white/5 border border-white/10 text-[#94a3b8]",
    success: "bg-emerald-500/10 border border-emerald-500/20 text-[#22c55e]",
    warning: "bg-amber-500/10 border border-amber-500/20 text-[#f59e0b]",
    danger: "bg-red-500/10 border border-red-500/20 text-[#ef4444]",
    info: "bg-teal-500/10 border border-teal-500/20 text-[#14b8a6]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
