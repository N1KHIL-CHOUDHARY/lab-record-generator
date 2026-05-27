import api from './api';
import type { ApiResponse, RecordItem, DashboardStats } from '@/types';

export async function getDashboard() {
  const { data } = await api.get<ApiResponse<DashboardStats>>('/records/dashboard');
  return data.data;
}

export async function generateRecord(subjectId: string) {
  const { data } = await api.post<ApiResponse<RecordItem>>('/records', { subjectId });
  return data.data;
}

export async function getHistory() {
  const { data } = await api.get<ApiResponse<RecordItem[]>>('/history');
  return data.data;
}

export async function deleteRecord(id: string) {
  await api.delete(`/history/${id}`);
}
