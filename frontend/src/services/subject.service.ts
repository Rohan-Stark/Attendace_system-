import { get, post, put, del } from '../lib/api-client';

export interface Subject {
  id: number;
  name: string;
  code: string;
  semester: number;
  department_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubjectCreate {
  name: string;
  code: string;
  semester: number;
  is_active?: boolean;
}

export interface SubjectUpdate {
  name?: string;
  code?: string;
  semester?: number;
  is_active?: boolean;
}

export interface TeacherSubjectAssignment {
  id: number;
  teacher_id: number;
  subject_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  subject_name?: string;
  subject_code?: string;
  semester?: number;
}

export interface TeacherSubjectAssignmentCreate {
  teacher_id: number;
  subject_id: number;
  is_active?: boolean;
}

export const subjectService = {
  // HOD endpoints
  getSubjects: async (semester?: number) => {
    const query = semester ? `?semester=${semester}` : '';
    return get<Subject[]>(`/hod/subjects${query}`);
  },

  createSubject: async (data: SubjectCreate) => {
    return post<Subject>('/hod/subjects', data);
  },

  updateSubject: async (id: number, data: SubjectUpdate) => {
    return put<Subject>(`/hod/subjects/${id}`, data);
  },

  getAssignments: async () => {
    return get<TeacherSubjectAssignment[]>('/hod/assignments');
  },

  createAssignment: async (data: TeacherSubjectAssignmentCreate) => {
    return post<TeacherSubjectAssignment>('/hod/assignments', data);
  },

  removeAssignment: async (id: number) => {
    return del(`/hod/assignments/${id}`);
  },

  // Teacher endpoints
  getAssignedSubjects: async (semester?: number) => {
    const query = semester ? `?semester=${semester}` : '';
    return get<Subject[]>(`/attendance/subjects/assigned${query}`);
  },
};
