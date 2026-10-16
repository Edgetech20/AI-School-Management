import { apiClient } from "./client";
import type { ClassItem } from "../types";

export async function getClasses() {
  const response = await apiClient.get<ClassItem[]>("/classes");
  return response.data;
}

export async function createClass(name: string) {
  const response = await apiClient.post<ClassItem>("/classes", { name });
  return response.data;
}

export async function deleteClass(classId: number) {
  await apiClient.delete(`/classes/${classId}`);
}
