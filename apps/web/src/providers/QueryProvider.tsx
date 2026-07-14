"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

/**
 * TanStack Query provider with optimal default configuration.
 *
 * Defaults are set to be safe and predictable for a collaborative
 * real-time app where data changes frequently:
 * - staleTime: 60s — data is "fresh" for 1 minute
 * - gcTime: 5min — unused cache is kept for 5 minutes
 * - retry: 1 — only retry once on failure (not for 4xx errors)
 * - refetchOnWindowFocus: true — sync when user returns to the tab
 */

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
          // Don't retry on client errors (4xx)
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < 1;
        },
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Singleton on server, per-component on client (for Next.js hydration safety)
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => getQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
