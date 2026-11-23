import { get, post, patch, del } from '../lib/api-client';
import type {
  Department, DepartmentCreate, DepartmentUpdate,
  HODResponse, HODCreate, HODUpdate, HODCreationResponse,
  ParentNotificationListResponse, ParentNotificationItem,
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

/* ── Parent Notifications (Global Admin) ── */

export function getAdminParentNotifications(params?: {
  department_id?: number;
  state?: string;
  event_type?: string;
  attendance_status?: string;
  usn?: string;
  session_id?: number;
  page?: number;
  page_size?: number;
}): Promise<ParentNotificationListResponse> {
  const parts: string[] = [];
  if (params) {
    if (params.department_id) parts.push(`department_id=${params.department_id}`);
    if (params.state) parts.push(`state=${encodeURIComponent(params.state)}`);
    if (params.event_type) parts.push(`event_type=${encodeURIComponent(params.event_type)}`);
    if (params.attendance_status) parts.push(`attendance_status=${encodeURIComponent(params.attendance_status)}`);
    if (params.usn) parts.push(`usn=${encodeURIComponent(params.usn)}`);
    if (params.session_id) parts.push(`session_id=${params.session_id}`);
    if (params.page) parts.push(`page=${params.page}`);
    if (params.page_size) parts.push(`page_size=${params.page_size}`);
  }
  const query = parts.length ? `?${parts.join('&')}` : '';
  return get<ParentNotificationListResponse>(`/admin/parent-notifications${query}`);
}

export function retryAdminParentNotification(notificationId: number): Promise<ParentNotificationItem> {
  return post<ParentNotificationItem>(`/admin/parent-notifications/${notificationId}/retry`);
}

