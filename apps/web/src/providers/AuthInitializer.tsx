"use client";

import { type ReactNode, useEffect } from "react";

import { authApi } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth.store";

interface AuthInitializerProps {
  children: ReactNode;
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const { isInitialized, setAuth, clearAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized) {
      return;
    }

    const initializeAuth = async () => {
      // Check if session indicator cookie exists
      const hasSessionCookie = document.cookie
        .split("; ")
        .some((row) => row.startsWith("syncspace_has_session="));

      if (!hasSessionCookie) {
        setInitialized(true);
        return;
      }

      try {
        // Attempt to refresh the access token using the HTTP-only refresh cookie
        const refreshResponse = await authApi.refresh();
        const { accessToken } = refreshResponse.data;

        // Fetch user profile info
        const meResponse = await authApi.me();
        const { user } = meResponse.data;

        // Hydrate store
        setAuth(user, accessToken);
      } catch {
        // Clear stale local states
        clearAuth();
        document.cookie = "syncspace_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } finally {
        setInitialized(true);
      }
    };

    void initializeAuth();
  }, [isInitialized, setAuth, clearAuth, setInitialized]);

  return <>{children}</>;
}
