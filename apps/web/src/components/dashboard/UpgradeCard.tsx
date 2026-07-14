"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "../ui/button";

interface UpgradeCardProps {
  orgSlug: string;
}

export function UpgradeCard({ orgSlug }: UpgradeCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-3xl border border-white/5 bg-[#0f1c25]/85 p-5 space-y-3 relative overflow-hidden shadow-lg"
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Crown className="w-4 h-4 text-amber-500" />
        </div>
        <span className="text-sm font-bold text-white">Upgrade your plan</span>
      </div>
      <p className="text-xs text-[#94a3b8] leading-relaxed">
        Unlock advanced features, unlimited boards, and boost your team productivity.
      </p>
      <Button
        asChild
        variant="primary"
        size="md"
        className="w-full text-xs font-bold flex items-center justify-center gap-1.5"
      >
        <Link href={`/dashboard/${orgSlug}/settings`}>
          <Crown className="w-3.5 h-3.5" />
          Upgrade Now
        </Link>
      </Button>
    </motion.div>
  );
}
