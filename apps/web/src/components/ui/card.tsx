"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  animate?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, animate = true, ...props }, ref) => {
    const Component = animate ? motion.div : "div";
    const animationProps = animate
      ? {
          whileHover: { y: -4, shadow: "0px 0px 50px rgba(16,185,129,0.25)" },
          transition: { type: "spring", stiffness: 300, damping: 20 },
        }
      : {};

    return (
      // @ts-expect-error Component typing
      <Component
        ref={ref}
        className={cn(
          "rounded-3xl backdrop-blur-xl border border-white/5 bg-[#0f1c25]/85 shadow-xl transition-all duration-500 overflow-hidden",
          className,
        )}
        {...animationProps}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Card.displayName = "Card";
