import { apiClient } from "./client";
import type { Student } from "../types";

export async function getStudents() {
  const response = await apiClient.get<Student[]>('/students');
  return response.data;
}

export async function createStudent(payload: Omit<Student, 'id'>) {
  const response = await apiClient.post<Student>('/students', payload);
  return response.data;
}

export async function downloadStudentsImportTemplate() {
  const response = await apiClient.get('/students/import-template', {
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function importStudentsCsv(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/students/import-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
  return response.data;
}
