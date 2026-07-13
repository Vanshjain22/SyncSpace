"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, HelpCircle, Mail, MessageSquare, Sparkles, X } from "lucide-react";

export function HelpModal() {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenTrigger = () => {
      setIsOpen(true);
    };
    const handleCloseAll = () => {
      setIsOpen(false);
    };
    window.addEventListener("open-help-modal", handleOpenTrigger);
    window.addEventListener("close-all-modals", handleCloseAll);
    return () => {
      window.removeEventListener("open-help-modal", handleOpenTrigger);
      window.removeEventListener("close-all-modals", handleCloseAll);
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const helpTopics = [
    {
      title: "Product Documentation",
      desc: "Deep-dive user guides, sprints setups, and onboarding materials.",
      icon: BookOpen,
      action: () => alert("Redirecting to documentation portals..."),
    },
    {
      title: "Live Chat Support",
      desc: "Instant live text helper for technical queries (24/7).",
      icon: MessageSquare,
      action: () => alert("Initiating Live Chat agent support flow..."),
    },
    {
      title: "Contact Desk Email",
      desc: "Reach our developer support desk directly via email ticket.",
      icon: Mail,
      action: () => window.open("mailto:support@syncspace.com"),
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1c25]/95 backdrop-blur-xl p-6 shadow-2xl relative select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-[#10b981]" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  SyncSpace Help Center
                </h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Help Option List */}
            <div className="space-y-3">
              {helpTopics.map((topic, idx) => (
                <div
                  key={idx}
                  onClick={topic.action}
                  className="flex gap-4 p-3 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] shrink-0 h-10 w-10 flex items-center justify-center">
                    <topic.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{topic.title}</h5>
                    <p className="text-[11px] text-[#94a3b8] mt-1 font-semibold leading-relaxed">
                      {topic.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Assistant Promo */}
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/10 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                  AI Support Autopilot
                </h5>
                <p className="text-[10px] text-zinc-400 font-semibold leading-normal mt-1">
                  You can type{" "}
                  <kbd className="px-1 py-0.5 rounded bg-zinc-950 border border-white/5 font-mono text-[9px] text-[#10b981]">
                    /ai
                  </kbd>{" "}
                  in command palette to ask questions directly.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
