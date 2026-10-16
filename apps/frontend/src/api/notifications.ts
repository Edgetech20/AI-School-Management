import { apiClient } from "./client";
import type { NotificationLog } from "../types";

export async function getNotifications() {
  const response = await apiClient.get<NotificationLog[]>('/notifications');
  return response.data;
}
