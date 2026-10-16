import { apiClient } from "./client";
import type { AttendanceLog, RecognitionAccuracyMetrics, RecognitionReviewRead } from "../types";

export async function getAttendanceLogs() {
  const response = await apiClient.get<AttendanceLog[]>('/attendance');
  return response.data;
}

export async function createAttendanceEvent(payload: {
  student_id: number;
  timestamp: string;
  event_type: "check_in" | "check_out";
}) {
  const response = await apiClient.post<AttendanceLog>('/attendance/event', payload);
  return response.data;
}

export async function overrideAttendance(
  attendanceId: number,
  payload: {
    check_in_time?: string | null;
    check_out_time?: string | null;
    status?: string | null;
  }
) {
  const response = await apiClient.put<AttendanceLog>(`/attendance/${attendanceId}/override`, payload);
  return response.data;
}

export async function exportAttendance(format: "csv" | "xlsx") {
  const response = await apiClient.get(`/attendance/export?format=${format}`, {
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function getRecognitionMetrics() {
  const response = await apiClient.get<RecognitionAccuracyMetrics>('/attendance/recognition-metrics');
  return response.data;
}

export async function getReviewQueue() {
  const response = await apiClient.get<RecognitionReviewRead[]>('/attendance/recognition/review-queue');
  return response.data;
}

export async function approveReview(reviewId: number, payload: { note: string }) {
  const response = await apiClient.post(`/attendance/recognition/review-queue/${reviewId}/approve`, payload);
  return response.data;
}

export async function rejectReview(reviewId: number, payload: { note: string }) {
  const response = await apiClient.post(`/attendance/recognition/review-queue/${reviewId}/reject`, payload);
  return response.data;
}
