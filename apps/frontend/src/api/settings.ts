import { apiClient } from "./client";
import type { NotificationSettings } from "../types";

export interface PublicSettings {
  hybrid_learning_enabled: boolean;
}

export async function getPublicSettings() {
  const response = await apiClient.get<PublicSettings>("/settings/public");
  return response.data;
}

export async function getNotificationSettings() {
  const response = await apiClient.get<NotificationSettings>("/settings/notifications");
  return response.data;
}

export async function updateNotificationSettings(payload: Partial<NotificationSettings>) {
  const response = await apiClient.put<NotificationSettings>("/settings/notifications", payload);
  return response.data;
}
