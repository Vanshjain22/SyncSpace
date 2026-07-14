import Link from "next/link";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s | SyncSpace",
    default: "Sign in",
  },
};

/**
 * Auth layout — split panel design.
 * Left: branded pattern panel (desktop only). Right: form content.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — brand (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-background to-purple-500/5 relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-brand-glow">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">SyncSpace</span>
          </Link>

          {/* Testimonial */}
          <div className="max-w-md">
            <blockquote className="text-lg font-medium text-foreground/80 leading-relaxed mb-4">
              &ldquo;SyncSpace changed how our team collaborates. Everything we need is in one
              beautiful workspace.&rdquo;
            </blockquote>
            <div>
              <p className="text-sm font-semibold">Sarah Chen</p>
              <p className="text-xs text-muted-foreground">VP of Engineering, TechFlow</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} SyncSpace
          </p>
        </div>
      </div>

      {/* Right Panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
