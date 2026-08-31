import { get, post } from '../lib/api-client';
import type { LoginResponse, UserMe } from '../types/api';

export function login(login_id: string, password: string): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/login', { login_id, password });
}

export function getMe(): Promise<UserMe> {
  return get<UserMe>('/auth/me');
}

export function changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/change-password', { current_password, new_password });
}

export function forgotPassword(login_id: string): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/forgot-password', { login_id });
}

export function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/reset-password', { token, new_password });
}

export function logout(): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/logout');
}

export function firstTimeSignup(data: any): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/first-time-signup', data);
}
