"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { authApi } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth.store";

interface AuthInitializerProps {
  children: ReactNode;
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const router = useRouter();
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
        try {
          // Auto-login with test credentials to bypass the login screen during testing
          const loginResponse = await authApi.login({
            email: "test@test.com",
            password: "Password123!",
          });
          const { user, accessToken } = loginResponse.data;
          setAuth(user, accessToken);
          document.cookie = "syncspace_has_session=true; path=/";

          // Use client-side router for smooth redirect
          router.push("/dashboard/acme-corp");
        } catch (error) {
          console.error("Auto-login failed:", error);
          setInitialized(true);
        }
        return;
      }

      try {
        // Attempt to refresh the access token using the HTTP-only refresh cookie
        const refreshResponse = await authApi.refresh();
        const { accessToken } = refreshResponse.data;

        // Fetch user profile info
        const meResponse = await authApi.me(accessToken);
        const { user } = meResponse.data;

        // Hydrate store
        setAuth(user, accessToken);
      } catch (error: any) {
        // Only clear session if it is an explicit auth failure (401 or 400).
        // Do not log out for temporary rate limits (429), server downtime (5xx), or network issues.
        const status = error?.response?.status;
        const isAuthError = status === 401 || status === 400;

        if (isAuthError) {
          clearAuth();
          document.cookie = "syncspace_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

          // Self-heal immediately by attempting background auto-login instead of a hard page reload
          try {
            const loginResponse = await authApi.login({
              email: "test@test.com",
              password: "Password123!",
            });
            const { user: newUser, accessToken: newAccessToken } = loginResponse.data;
            setAuth(newUser, newAccessToken);
            document.cookie = "syncspace_has_session=true; path=/";
            router.push("/dashboard/acme-corp");
          } catch (err) {
            console.error("Background auto-login recovery failed:", err);
            router.push("/login");
          }
        }
      } finally {
        setInitialized(true);
      }
    };

    void initializeAuth();
  }, [isInitialized, setAuth, clearAuth, setInitialized, router]);

  return <>{children}</>;
}
