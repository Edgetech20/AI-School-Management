import { apiClient } from "./client";
import type { AdminUser } from "../types";

export type CreateUserPayload = {
  username: string;
  password: string;
  role: "admin" | "teacher";
  class_name?: string;
  is_active?: boolean;
};

export type UpdateUserPayload = {
  password?: string;
  role?: "admin" | "teacher";
  class_name?: string;
  is_active?: boolean;
};

export async function getUsers() {
  const response = await apiClient.get<AdminUser[]>("/users");
  return response.data;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await apiClient.post<AdminUser>("/users", payload);
  return response.data;
}

export async function updateUser(userId: number, payload: UpdateUserPayload) {
  const response = await apiClient.put<AdminUser>(`/users/${userId}`, payload);
  return response.data;
}

export async function deleteUser(userId: number) {
  await apiClient.delete(`/users/${userId}`);
}
