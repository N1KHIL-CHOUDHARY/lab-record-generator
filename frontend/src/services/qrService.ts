import api from './api';
import type { ApiResponse } from '@/types';

export interface CreateQrResponse {
  shortId: string;
  targetUrl: string;
  redirectUrl: string;
  qrDataUrl: string;
  qrImage: string;
}

export interface UpdateQrResponse {
  shortId: string;
  targetUrl: string;
}

export async function createDynamicQr(targetUrl: string, experimentId?: string) {
  const { data } = await api.post<ApiResponse<CreateQrResponse>>('/qr', {
    targetUrl,
    experimentId,
  });
  return data.data;
}

export async function updateDynamicQr(shortId: string, targetUrl: string) {
  const { data } = await api.patch<ApiResponse<UpdateQrResponse>>(`/qr/${shortId}`, {
    targetUrl,
  });
  return data.data;
}

export async function getQrAnalytics() {
  const { data } = await api.get<ApiResponse<any>>('/qr/analytics');
  return data.data;
}
