"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useOrgStore } from "@/stores/org.store";

export function KeyboardShortcutsHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentOrganization, organizations } = useOrgStore();

  // Create refs to avoid stale closures in event listener
  const pathnameRef = useRef(pathname);
  const currentOrgRef = useRef(currentOrganization);
  const organizationsRef = useRef(organizations);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    currentOrgRef.current = currentOrganization;
  }, [currentOrganization]);

  useEffect(() => {
    organizationsRef.current = organizations;
  }, [organizations]);

  useEffect(() => {
    let lastKey = "";
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect editable nodes
      const activeEl = document.activeElement;
      const isEditable =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.tagName === "SELECT" ||
        activeEl?.hasAttribute("contenteditable") ||
        (activeEl as HTMLElement)?.isContentEditable;

      // 1. Command Palette Toggle (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        window.dispatchEvent(new Event("toggle-command-palette"));
        return;
      }

      // Ignore other shortcuts when typing in inputs/editable elements
      if (isEditable) {
        return;
      }

      // 2. Escape Key (Close all modals, command palette, dropdowns)
      if (e.key === "Escape") {
        window.dispatchEvent(new Event("close-all-modals"));
        return;
      }

      // 3. Question Mark (?) Key (Open keyboard shortcuts modal)
      if (e.key === "?") {
        e.preventDefault();
        window.dispatchEvent(new Event("open-keyboard-shortcuts"));
        return;
      }

      // 4. Sequential Shortcuts (G -> D, G -> P, G -> T)
      if (lastKey === "g") {
        // Resolve target organization slug
        const parts = pathnameRef.current.split("/");
        const urlSlug = parts[1] === "dashboard" ? parts[2] : undefined;
        const slug = urlSlug || currentOrgRef.current?.slug || organizationsRef.current[0]?.slug;

        if (!slug) {
          lastKey = "";
          return;
        }

        const targetKey = e.key.toLowerCase();
        if (targetKey === "d") {
          e.preventDefault();
          router.push(`/dashboard/${slug}`);
        } else if (targetKey === "p") {
          e.preventDefault();
          router.push(`/dashboard/${slug}/projects`);
        } else if (targetKey === "t") {
          e.preventDefault();
          router.push(`/dashboard/${slug}/tasks`);
        }

        lastKey = "";
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } else if (lastKey === "c") {
        // Resolve target organization slug
        const parts = pathnameRef.current.split("/");
        const urlSlug = parts[1] === "dashboard" ? parts[2] : undefined;
        const slug = urlSlug || currentOrgRef.current?.slug || organizationsRef.current[0]?.slug;

        if (!slug) {
          lastKey = "";
          return;
        }

        const targetKey = e.key.toLowerCase();
        if (targetKey === "p") {
          e.preventDefault();
          router.push(`/dashboard/${slug}/projects/new`);
        } else if (targetKey === "t") {
          e.preventDefault();
          router.push(`/dashboard/${slug}/projects`);
        }

        lastKey = "";
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } else if (e.key.toLowerCase() === "g") {
        lastKey = "g";
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          if (lastKey === "g") {
            lastKey = "";
          }
        }, 1200);
      } else if (e.key.toLowerCase() === "c") {
        lastKey = "c";
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          if (lastKey === "c") {
            lastKey = "";
          }
        }, 1200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router]);

  return null;
}
