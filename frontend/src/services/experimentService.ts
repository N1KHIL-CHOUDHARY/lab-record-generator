import api from './api';
import type { ApiResponse, Experiment } from '@/types';
import type { ExperimentRowData } from '@/utils/validators';

export async function createExperiment(subjectId: string, payload: ExperimentRowData) {
  const { data } = await api.post<ApiResponse<Experiment>>(`/experiments/${subjectId}`, payload);
  return data.data;
}

export async function updateExperiment(id: string, payload: Partial<ExperimentRowData>) {
  const { data } = await api.put<ApiResponse<Experiment>>(`/experiments/${id}`, payload);
  return data.data;
}

export async function deleteExperiment(id: string) {
  await api.delete(`/experiments/${id}`);
}

export async function reorderExperiments(subjectId: string, order: string[]) {
  const { data } = await api.patch<ApiResponse<Experiment[]>>(
    `/experiments/${subjectId}/reorder`,
    { order }
  );
  return data.data;
}

export async function updateQrLink(shortId: string, originalUrl: string) {
  await api.patch(`/qr/${shortId}`, { originalUrl });
}
