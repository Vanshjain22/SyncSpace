import {
  type ApiResponse,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
  type UserPublic,
} from "@syncspace/shared";

import { api } from "./api-client";

export interface LoginResponseData {
  user: AuthUser;
  accessToken: string;
}

export const authApi = {
  /**
   * Register a new user account.
   */
  async register(data: RegisterInput): Promise<ApiResponse<LoginResponseData>> {
    return api.post<ApiResponse<LoginResponseData>>("/auth/register", data);
  },

  /**
   * Log in an existing user.
   */
  async login(data: LoginInput): Promise<ApiResponse<LoginResponseData>> {
    return api.post<ApiResponse<LoginResponseData>>("/auth/login", data);
  },

  /**
   * Log out the current user and invalidate the session.
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>("/auth/logout");
  },

  /**
   * Refresh the access token using the HTTP-only cookie.
   */
  async refresh(): Promise<ApiResponse<{ accessToken: string }>> {
    return api.post<ApiResponse<{ accessToken: string }>>("/auth/refresh");
  },

  /**
   * Get the profile of the current authenticated user.
   */
  async me(): Promise<ApiResponse<{ user: UserPublic }>> {
    return api.get<ApiResponse<{ user: UserPublic }>>("/auth/me");
  },
};
