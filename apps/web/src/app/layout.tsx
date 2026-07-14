import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import type { Metadata, Viewport } from "next";

import { Providers } from "@/providers";

import "./globals.css";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "SyncSpace — Team Collaboration Platform",
    template: "%s | SyncSpace",
  },
  description:
    "SyncSpace is a modern team collaboration platform for managing projects, tasks, and communication in one place.",
  keywords: ["team collaboration", "project management", "kanban", "task tracking", "productivity"],
  authors: [{ name: "SyncSpace" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://syncspace.dev",
    siteName: "SyncSpace",
    title: "SyncSpace — Team Collaboration Platform",
    description: "Manage projects, track tasks, and collaborate in real time with your team.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
};

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
