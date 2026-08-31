import { get, post, patch, del } from '../lib/api-client';
import type {
  Department, DepartmentCreate, DepartmentUpdate,
  HODResponse, HODCreate, HODUpdate, HODCreationResponse,
} from '../types/api';

/* ── Departments ── */

export function getDepartments(): Promise<Department[]> {
  return get<Department[]>('/admin/departments');
}

export function getDepartment(id: number): Promise<Department> {
  return get<Department>(`/admin/departments/${id}`);
}

export function createDepartment(data: DepartmentCreate): Promise<Department> {
  return post<Department>('/admin/departments', data);
}

export function updateDepartment(id: number, data: DepartmentUpdate): Promise<Department> {
  return patch<Department>(`/admin/departments/${id}`, data);
}

/* ── HODs ── */

export function getHods(): Promise<HODResponse[]> {
  return get<HODResponse[]>('/admin/hods');
}

export function getHod(id: number): Promise<HODResponse> {
  return get<HODResponse>(`/admin/hods/${id}`);
}

export function createHod(data: HODCreate): Promise<HODCreationResponse> {
  return post<HODCreationResponse>('/admin/hods', data);
}

export function updateHod(id: number, data: HODUpdate): Promise<HODResponse> {
  return patch<HODResponse>(`/admin/hods/${id}`, data);
}

export function deactivateHod(id: number): Promise<{ message: string }> {
  return post<{ message: string }>(`/admin/hods/${id}/deactivate`);
}

export function activateHod(id: number): Promise<{ message: string }> {
  return post<{ message: string }>(`/admin/hods/${id}/activate`);
}

export function removeHod(id: number): Promise<{ message: string }> {
  return del<{ message: string }>(`/admin/hods/${id}`);
}

export function resetHodPassword(id: number): Promise<{ message: string; temporary_password: string }> {
  return post<{ message: string; temporary_password: string }>(`/admin/hods/${id}/reset-password`);
}
