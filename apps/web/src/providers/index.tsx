import { type ReactNode } from "react";

import { AuthInitializer } from "./AuthInitializer";
import { QueryProvider } from "./QueryProvider";
import { SocketProvider } from "./SocketProvider";
import { ThemeProvider } from "./ThemeProvider";

import { KeyboardShortcutsHandler } from "@/components/KeyboardShortcutsHandler";

/**
 * Root provider composition.
 *
 * All app-level providers are composed here and applied in the root layout.
 * Order matters: outer providers are initialized first.
 */

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthInitializer>
          <SocketProvider>
            <KeyboardShortcutsHandler />
            {children}
          </SocketProvider>
        </AuthInitializer>
      </QueryProvider>
    </ThemeProvider>
  );
}
