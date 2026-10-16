import { apiClient } from "./client";

export async function getDailyAnalytics(date?: string) {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await apiClient.get(`/analytics/daily${suffix}`);
  return response.data;
}

export async function getWeeklyAnalytics(endDate?: string) {
  const suffix = endDate ? `?end_date=${encodeURIComponent(endDate)}` : "";
  const response = await apiClient.get(`/analytics/weekly${suffix}`);
  return response.data;
}

export async function getMonthlyAnalytics(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year) params.append("year", String(year));
  if (month) params.append("month", String(month));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get(`/analytics/monthly${suffix}`);
  return response.data;
}
