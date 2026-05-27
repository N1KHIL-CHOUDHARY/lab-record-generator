import api from './api';
import type { ApiResponse, Subject, Experiment } from '@/types';
import type { SubjectFormData } from '@/utils/validators';

export async function getSubjects() {
  const { data } = await api.get<ApiResponse<Subject[]>>('/subjects');
  return data.data;
}

export async function getSubject(id: string) {
  const { data } = await api.get<ApiResponse<{ subject: Subject; experiments: Experiment[] }>>(
    `/subjects/${id}`
  );
  return data.data;
}

export async function createSubject(payload: SubjectFormData) {
  const { data } = await api.post<ApiResponse<Subject>>('/subjects', payload);
  return data.data;
}

export async function updateSubject(id: string, payload: Partial<SubjectFormData>) {
  const { data } = await api.put<ApiResponse<Subject>>(`/subjects/${id}`, payload);
  return data.data;
}

export async function deleteSubject(id: string) {
  await api.delete(`/subjects/${id}`);
}
