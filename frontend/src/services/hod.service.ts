import { get, post, patch, del } from '../lib/api-client';
import type {
  TeacherResponse, TeacherCreate, TeacherUpdate, TeacherCreationResponse,
  StudentResponse, StudentCreate, StudentUpdate, StudentCreationResponse, StudentTransferRequest,
  GuardianContact, GuardianContactCreate, GuardianContactUpdate,
  ParentNotificationListResponse, ParentNotificationItem,
} from '../types/api';

/* ── Teachers ── */

export function getTeachers(): Promise<TeacherResponse[]> {
  return get<TeacherResponse[]>('/hod/teachers');
}

export function getTeacher(id: number): Promise<TeacherResponse> {
  return get<TeacherResponse>(`/hod/teachers/${id}`);
}

export function createTeacher(data: TeacherCreate): Promise<TeacherCreationResponse> {
  return post<TeacherCreationResponse>('/hod/teachers', data);
}

export function updateTeacher(id: number, data: TeacherUpdate): Promise<TeacherResponse> {
  return patch<TeacherResponse>(`/hod/teachers/${id}`, data);
}

export function deactivateTeacher(id: number): Promise<{ message: string }> {
  return post<{ message: string }>(`/hod/teachers/${id}/deactivate`);
}

/* ── Students ── */

export function getStudents(params?: { semester?: number; section?: string; usn?: string }): Promise<StudentResponse[]> {
  let query = '';
  if (params) {
    const parts: string[] = [];
    if (params.semester) parts.push(`semester=${params.semester}`);
    if (params.section) parts.push(`section=${encodeURIComponent(params.section)}`);
    if (params.usn) parts.push(`usn=${encodeURIComponent(params.usn)}`);
    if (parts.length) query = `?${parts.join('&')}`;
  }
  return get<StudentResponse[]>(`/hod/students${query}`);
}

export function getStudent(id: number): Promise<StudentResponse> {
  return get<StudentResponse>(`/hod/students/${id}`);
}

export function createStudent(data: StudentCreate): Promise<StudentCreationResponse> {
  return post<StudentCreationResponse>('/hod/students', data);
}

export function updateStudent(id: number, data: StudentUpdate): Promise<StudentResponse> {
  return patch<StudentResponse>(`/hod/students/${id}`, data);
}

export function transferStudent(id: number, data: StudentTransferRequest): Promise<{ message: string }> {
  return post<{ message: string }>(`/hod/students/${id}/transfer`, data);
}

export function removeStudent(id: number): Promise<{ message: string }> {
  return post<{ message: string }>(`/hod/students/${id}/remove`);
}

/* ── Guardian Contacts ── */

export function getStudentGuardians(studentId: number): Promise<GuardianContact[]> {
  return get<GuardianContact[]>(`/hod/students/${studentId}/guardians`);
}

export function createStudentGuardian(studentId: number, data: GuardianContactCreate): Promise<GuardianContact> {
  return post<GuardianContact>(`/hod/students/${studentId}/guardians`, data);
}

export function updateStudentGuardian(
  studentId: number,
  guardianId: number,
  data: GuardianContactUpdate
): Promise<GuardianContact> {
  return patch<GuardianContact>(`/hod/students/${studentId}/guardians/${guardianId}`, data);
}

export function deleteStudentGuardian(studentId: number, guardianId: number): Promise<{ message: string }> {
  return del<{ message: string }>(`/hod/students/${studentId}/guardians/${guardianId}`);
}

/* ── Parent Notifications (Department-Scoped) ── */

export function getHodParentNotifications(params?: {
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
    if (params.state) parts.push(`state=${encodeURIComponent(params.state)}`);
    if (params.event_type) parts.push(`event_type=${encodeURIComponent(params.event_type)}`);
    if (params.attendance_status) parts.push(`attendance_status=${encodeURIComponent(params.attendance_status)}`);
    if (params.usn) parts.push(`usn=${encodeURIComponent(params.usn)}`);
    if (params.session_id) parts.push(`session_id=${params.session_id}`);
    if (params.page) parts.push(`page=${params.page}`);
    if (params.page_size) parts.push(`page_size=${params.page_size}`);
  }
  const query = parts.length ? `?${parts.join('&')}` : '';
  return get<ParentNotificationListResponse>(`/hod/parent-notifications${query}`);
}

export function retryHodParentNotification(notificationId: number): Promise<ParentNotificationItem> {
  return post<ParentNotificationItem>(`/hod/parent-notifications/${notificationId}/retry`);
}

