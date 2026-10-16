import { apiClient } from "./client";
import type { RuleConfig } from "../types";

export async function getRules() {
  const response = await apiClient.get<RuleConfig>('/rules');
  return response.data;
}

export async function updateRules(payload: Omit<RuleConfig, 'id'>) {
  const response = await apiClient.put<RuleConfig>('/rules', payload);
  return response.data;
}
