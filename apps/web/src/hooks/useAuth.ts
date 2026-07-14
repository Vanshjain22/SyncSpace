"use client";

import { type LoginInput, type RegisterInput } from "@syncspace/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api-client";
import { authApi } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth.store";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { user, accessToken, isAuthenticated, isInitialized, setAuth, clearAuth } = useAuthStore();

  const setSessionCookie = () => {
    if (typeof window !== "undefined") {
      // Secure indicator cookie for Next.js Middleware redirects
      document.cookie = "syncspace_has_session=true; path=/; max-age=604800; SameSite=Lax";
    }
  };

  const clearSessionCookie = () => {
    if (typeof window !== "undefined") {
      document.cookie = "syncspace_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  };

  // ─── Login Mutation ────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await authApi.login(data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      setSessionCookie();
      queryClient.clear();
      router.push("/dashboard");
      router.refresh();
    },
  });

  // ─── Register Mutation ─────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const response = await authApi.register(data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      setSessionCookie();
      queryClient.clear();
      router.push("/dashboard");
      router.refresh();
    },
  });

  // ─── Logout Mutation ───────────────────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authApi.logout();
    },
    onSuccess: () => {
      clearAuth();
      clearSessionCookie();
      queryClient.clear();
      router.push("/");
      router.refresh();
    },
    onError: () => {
      // Even if network call fails, clear local auth state
      clearAuth();
      clearSessionCookie();
      queryClient.clear();
      router.push("/");
      router.refresh();
    },
  });

  return {
    user,
    accessToken,
    isAuthenticated,
    isInitialized,

    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error ? getApiErrorMessage(loginMutation.error) : null,

    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error ? getApiErrorMessage(registerMutation.error) : null,

    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
