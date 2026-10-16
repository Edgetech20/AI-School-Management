import { apiClient } from "./client";

export type CameraDevice = {
  id: number;
  device_id: string;
  name: string;
  location: string;
  ip_address: string | null;
  port: number | null;
  stream_url: string | null;
  stream_username: string | null;
  stream_password: string | null;
  usage_tag: "check_in" | "check_out" | "both";
  is_active: boolean;
  created_at: string;
};

export async function getCameras() {
  const response = await apiClient.get<CameraDevice[]>('/cameras');
  return response.data;
}

export async function createCamera(payload: {
  device_id: string;
  name: string;
  location: string;
  ip_address?: string | null;
  port?: number | null;
  stream_url?: string | null;
  stream_username?: string | null;
  stream_password?: string | null;
  usage_tag?: "check_in" | "check_out" | "both";
  is_active?: boolean;
}) {
  const response = await apiClient.post<CameraDevice>('/cameras', payload);
  return response.data;
}
