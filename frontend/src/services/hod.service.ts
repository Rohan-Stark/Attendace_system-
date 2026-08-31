import { get, post, patch } from '../lib/api-client';
import type {
  TeacherResponse, TeacherCreate, TeacherUpdate, TeacherCreationResponse,
  StudentResponse, StudentCreate, StudentUpdate, StudentCreationResponse, StudentTransferRequest,
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
