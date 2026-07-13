"use client";

import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    "primary" | "secondary" | "danger" | "warning" | "outline" | "ghost" | "link" | "default";
  size?: "sm" | "md" | "lg" | "default" | "icon";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs rounded-xl",
      md: "px-5 py-2.5 text-sm rounded-2xl",
      lg: "px-6 py-3 text-base rounded-2xl",
      default: "px-5 py-2.5 text-sm rounded-2xl",
      icon: "h-9 w-9 rounded-xl flex items-center justify-center",
    };

    const variantClasses = {
      primary:
        "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] border-0",
      secondary:
        "bg-white/5 border border-white/10 hover:border-white/20 text-white backdrop-blur-md font-semibold hover:bg-white/10",
      danger:
        "bg-red-500 hover:bg-red-600 text-white font-bold hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]",
      warning:
        "bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]",
      outline: "bg-transparent border border-white/10 hover:bg-white/5 text-white",
      ghost: "bg-transparent hover:bg-white/5 text-white border-0",
      link: "bg-transparent hover:underline text-[#10b981] border-0",
      default:
        "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] border-0",
    };

    const baseClasses = cn(
      "inline-flex items-center justify-center font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
      sizeClasses[size],
      variantClasses[variant],
      className,
    );

    if (asChild) {
      return (
        <Slot
          className={baseClasses}
          ref={ref}
          {...(props as React.ComponentPropsWithoutRef<typeof Slot>)}
        />
      );
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={baseClasses}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      />
    );
  },
);

Button.displayName = "Button";
