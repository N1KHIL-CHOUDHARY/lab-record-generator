import api from './api';
import type { ApiResponse, User } from '@/types';

export async function loginWithGoogle(idToken: string) {
  const { data } = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/google', {
    idToken,
  });
  return data.data;
}

export async function getMe() {
  const { data } = await api.get<ApiResponse<User>>('/auth/me');
  return data.data;
}
