import { apiClient } from "./client";

export interface UploadFacePayload {
  student_id: number;
  files: File[];
}

export interface RecognitionMatch {
  student_id: number;
  student_name?: string | null;
  class_name?: string | null;
  confidence: number;
  status: string;
}

export interface RecognitionResponse {
  matched_count: number;
  matches: RecognitionMatch[];
  detected_faces?: number;
  outcome?: "matched" | "unknown" | "no_face";
  nearest_candidate?: string | null;
  nearest_distance?: number | null;
  threshold?: number | null;
}

export async function uploadStudentFace(student_id: number, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("face_images", file));

  const response = await apiClient.post(
    `/students/${student_id}/face`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    }
  );
  return response.data;
}

export async function recognizeFacesFromFrame(
  frame: File,
  deviceId: string,
  eventType?: "check_in" | "check_out"
) {
  const formData = new FormData();
  formData.append("frame", frame);

  const query = new URLSearchParams();
  query.set("device_id", deviceId);
  if (eventType) {
    query.set("event_type", eventType);
  }

  const response = await apiClient.post<RecognitionResponse>(
    `/attendance/recognize?${query.toString()}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    }
  );
  return response.data;
}

export async function recognizeFacesFromMappedCamera(
  deviceId: string,
  eventType?: "check_in" | "check_out"
) {
  const query = new URLSearchParams();
  query.set("device_id", deviceId);
  if (eventType) {
    query.set("event_type", eventType);
  }

  const response = await apiClient.post<RecognitionResponse>(`/attendance/recognize/mapped?${query.toString()}`);
  return response.data;
}
