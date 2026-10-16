import { apiClient } from "./client";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  role: "admin" | "teacher";
  class_name: string | null;
  is_active: boolean;
}

export async function login(payload: LoginPayload) {
  const params = new URLSearchParams();
  params.append("username", payload.username);
  params.append("password", payload.password);

  const response = await apiClient.post<TokenResponse>('/auth/login', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get<CurrentUser>('/auth/me');
  return response.data;
}

export function logout() {
  localStorage.removeItem("auth_token");
  window.location.href = "/login";
}
