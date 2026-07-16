import { type ApiErrorResponse } from "@syncspace/shared";
import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";

import { useAuthStore } from "@/stores/auth.store";

/**
 * Typed Axios API client.
 *
 * - Automatically attaches Authorization header from localStorage
 * - Intercepts 401s and attempts token refresh (wired fully in Phase 2)
 * - Returns typed responses
 * - Provides a consistent error shape
 */

const BASE_URL =
  process.env["NEXT_PUBLIC_API_URL"] ??
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:4000/api");

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  console.info("SyncSpace API URL:", BASE_URL);
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies (refresh token)
});

// ─── Request Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config) => {
    // Attach access token from memory (Zustand store)
    const token = useAuthStore.getState().accessToken;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>)["Authorization"] =
              `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<{ data: { accessToken: string } }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = response.data.data.accessToken;

        useAuthStore.setState({ accessToken: newToken, isAuthenticated: true });

        processQueue(null, newToken);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>)["Authorization"] =
            `Bearer ${newToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);

        // Clear tokens in store
        useAuthStore.getState().clearAuth();

        if (typeof window !== "undefined") {
          // Invalidate session cookie to prevent infinite redirect loops on auth hydration
          document.cookie = "syncspace_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

          // Only force redirect to login if the request originated from a protected dashboard route
          const isProtectedRoute = window.location.pathname.startsWith("/dashboard");
          if (isProtectedRoute) {
            window.location.href = "/login";
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Typed request helpers ────────────────────────────────────────────────────

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((r) => r.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((r) => r.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((r) => r.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((r) => r.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((r) => r.data),
};

/**
 * Extracts a user-facing error message from an Axios error.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.error?.message ?? error.message ?? "An unexpected error occurred";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
