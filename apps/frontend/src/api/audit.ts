import { apiClient } from "./client";

export type AuditLog = {
  id: number;
  actor_username: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  created_at: string;
};

export async function getAuditLogs(limit = 200) {
  const response = await apiClient.get<AuditLog[]>(`/audit?limit=${limit}`);
  return response.data;
}
