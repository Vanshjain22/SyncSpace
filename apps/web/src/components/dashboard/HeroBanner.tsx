"use client";

import Link from "next/link";
import * as React from "react";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { Button } from "../ui/button";

interface HeroBannerProps {
  orgSlug: string;
  bannerOpen: boolean;
  onClose: () => void;
}

export function HeroBanner({ orgSlug, bannerOpen, onClose: _onClose }: HeroBannerProps) {
  if (!bannerOpen) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative rounded-3xl overflow-hidden border border-white/5 bg-[#0f1c25]/85 min-h-[280px] lg:min-h-[300px] flex flex-col justify-center p-8 md:p-10 shadow-xl group"
    >
      {/* Banner Panoramic Illustration Background */}
      <div
        className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-15 pointer-events-none transition-transform duration-1000 group-hover:scale-[1.02]"
        style={{ backgroundImage: `url('/lighthouse-banner.png')` }}
      />

      {/* Animated Seagulls in the Sky */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 hidden md:block">
        {/* Seagull 1 (Left to Right) */}
        <motion.div
          initial={{ x: -60, y: 40, scale: 0.7 }}
          animate={{
            x: [-60, 750],
            y: [40, 20, 45, 30],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute"
        >
          <motion.svg
            viewBox="0 0 24 10"
            className="w-10 h-5 text-[#10b981]/40 fill-none stroke-current"
            strokeWidth="1.8"
            strokeLinecap="round"
            animate={{ scaleY: [1, 0.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M 0,5 Q 6,0 12,5 Q 18,0 24,5" />
          </motion.svg>
        </motion.div>

        {/* Seagull 2 (Right to Left) */}
        <motion.div
          initial={{ x: 750, y: 80, scale: 0.5 }}
          animate={{
            x: [750, -60],
            y: [80, 55, 90, 70],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "linear",
            delay: 3,
          }}
          className="absolute"
        >
          <motion.svg
            viewBox="0 0 24 10"
            className="w-8 h-4 text-cyan-400/40 fill-none stroke-current"
            strokeWidth="1.8"
            strokeLinecap="round"
            animate={{ scaleY: [1, 0.2, 1] }}
            transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut", delay: 0.25 }}
          >
            <path d="M 0,5 Q 6,0 12,5 Q 18,0 24,5" />
          </motion.svg>
        </motion.div>
      </div>

      {/* Sweeping Light Beam Overlay */}
      <div className="absolute right-0 top-0 bottom-0 w-[80%] overflow-hidden pointer-events-none z-0 hidden md:block">
        <div className="absolute top-[32%] right-[112px] w-[550px] h-[250px] origin-top-right bg-gradient-to-l from-[#10b981]/15 via-[#10b981]/3 to-transparent animate-lighthouse-sweep pointer-events-none" />
      </div>

      {/* SVG Lighthouse Tower Structure */}
      <div className="absolute right-20 top-[22%] w-14 h-32 pointer-events-none z-10 shrink-0 hidden md:block group-hover:scale-105 transition-transform duration-500">
        <svg viewBox="0 0 60 120" className="w-full h-full text-zinc-600">
          <path
            d="M 5 110 L 55 110 L 50 120 L 10 120 Z"
            fill="currentColor"
            className="text-zinc-800"
          />
          <path
            d="M 15 30 L 45 30 L 50 110 L 10 110 Z"
            fill="currentColor"
            className="text-zinc-600"
          />
          <path
            d="M 10 25 L 50 25 L 48 30 L 12 30 Z"
            fill="currentColor"
            className="text-zinc-700"
          />
          <rect
            x="22"
            y="10"
            width="16"
            height="15"
            fill="currentColor"
            className="text-zinc-800"
          />
          <path d="M 20 10 A 10 10 0 0 1 40 10 Z" fill="currentColor" className="text-zinc-900" />
          <circle cx="30" cy="17" r="4.5" className="fill-[#10b981] animate-pulse" />
          <circle cx="30" cy="17" r="12" className="fill-[#10b981]/30 animate-ping opacity-75" />
        </svg>
      </div>

      {/* Dark Overlay Gradient to ensure contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#071017] via-[#071017]/85 to-transparent pointer-events-none" />

      {/* Banner Content */}
      <div className="relative z-10 max-w-lg space-y-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight tracking-tight">
          Get more done with your team
        </h2>
        <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed">
          Collaborate, organize, and ship projects faster than ever. Assign columns, configure
          milestones, and sync tasks in real time.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            asChild
            variant="primary"
            size="sm"
            className="shadow-[0_0_15px_rgba(16,185,129,0.2)] font-bold text-xs"
          >
            <Link href={`/dashboard/${orgSlug}/projects/new`}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Project
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="text-xs font-bold bg-[#0b1622]/40 hover:bg-[#0b1622]/80 border border-white/5"
          >
            <Link href={`/dashboard/${orgSlug}/settings`}>Invite Members</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
