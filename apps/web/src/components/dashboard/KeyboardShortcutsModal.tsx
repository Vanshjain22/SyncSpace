"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Keyboard, X } from "lucide-react";
import * as React from "react";
import { useEffect, useRef, useState } from "react";

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMac(typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  useEffect(() => {
    const handleOpenTrigger = () => {
      setIsOpen(true);
    };
    const handleCloseAll = () => {
      setIsOpen(false);
    };

    window.addEventListener("open-keyboard-shortcuts", handleOpenTrigger);
    window.addEventListener("close-all-modals", handleCloseAll);

    return () => {
      window.removeEventListener("open-keyboard-shortcuts", handleOpenTrigger);
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

  const shortcuts = [
    { keys: ["G", "D"], desc: "Go to Dashboard", type: "sequential" },
    { keys: ["G", "P"], desc: "Go to Projects", type: "sequential" },
    { keys: ["G", "T"], desc: "Go to Tasks", type: "sequential" },
    { keys: ["C", "P"], desc: "Create Project", type: "sequential" },
    { keys: ["C", "T"], desc: "Create Task (Select Project)", type: "sequential" },
    { keys: [isMac ? "⌘" : "Ctrl", "K"], desc: "Command Palette", type: "simultaneous" },
    { keys: ["?"], desc: "Open Keyboard Shortcuts", type: "single" },
    { keys: ["Esc"], desc: "Close Modals / Dropdowns", type: "single" },
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
                <Keyboard className="w-5 h-5 text-[#10b981]" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Keyboard Shortcuts
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

            {/* Shortcut lists */}
            <div className="space-y-4">
              {shortcuts.map((shortcut, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#94a3b8]">{shortcut.desc}</span>
                  <div className="flex items-center gap-1.5">
                    {shortcut.keys.map((key, keyIdx) => (
                      <React.Fragment key={keyIdx}>
                        {keyIdx > 0 &&
                          (shortcut.type === "simultaneous" ? (
                            <span className="text-zinc-500 font-bold px-0.5 text-xs">+</span>
                          ) : (
                            <ArrowRight className="w-3 h-3 text-zinc-600" />
                          ))}
                        <kbd className="px-2 py-1 rounded bg-zinc-950 border border-white/5 text-[10px] font-mono text-[#10b981] min-w-[24px] text-center shadow-inner">
                          {key}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer tips */}
            <div className="border-t border-white/5 pt-4 mt-6 text-center">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                Keyboard shortcuts are disabled while typing in input fields.
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
