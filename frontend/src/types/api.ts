/* ── Auth Response Types ── */

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  requires_password_change: boolean;
  user_id: number;
}

export interface UserMe {
  id: number;
  email: string;
  role: 'primary_admin' | 'hod' | 'teacher' | 'student';
  department_id: number | null;
  is_active: boolean;
  must_change_password: boolean;
}

/* ── Department ── */

export interface Department {
  id: number;
  name: string;
  code: string;
  created_at: string;
  updated_at: string | null;
}

export interface DepartmentCreate {
  name: string;
  code: string;
}

export interface DepartmentUpdate {
  name?: string;
  code?: string;
}

/* ── HOD ── */

export interface HODResponse {
  id: number;
  email: string;
  is_active: boolean;
  department_id: number;
  name: string | null;
  created_at: string;
}

export interface HODCreate {
  email: string;
  name: string;
  department_id: number;
}

export interface HODUpdate {
  name?: string;
  email?: string;
  department_id?: number;
  is_active?: boolean;
}

export interface HODCreationResponse {
  hod: HODResponse;
  temporary_password: string;
}

/* ── Teacher ── */

export interface TeacherProfileData {
  employee_id: string;
  name: string;
}

export interface TeacherResponse {
  id: number;
  is_active: boolean;
  department_id: number;
  profile: TeacherProfileData | null;
  created_at: string;
}

export interface TeacherCreate {
  employee_id: string;
  name: string;
}

export interface TeacherUpdate {
  name?: string;
  employee_id?: string;
  is_active?: boolean;
}

export interface TeacherCreationResponse {
  teacher: TeacherResponse;
  temporary_password: string;
}

export interface StudentCreationResponse {
  student: StudentResponse;
  temporary_password?: string;
}

/* ── Student ── */

export interface StudentProfileData {
  usn: string;
  current_semester: number;
  current_section: string;
  status: 'active' | 'removed';
  name: string;
}

export interface StudentResponse {
  id: number;
  is_active: boolean;
  department_id: number;
  profile: StudentProfileData | null;
  created_at: string;
}

export interface StudentCreate {
  usn: string;
  name: string;
  initial_password?: string;
  generate_demo_password?: boolean;
  current_semester: number;
  current_section: string;
}

export interface StudentUpdate {
  name?: string;
  current_semester?: number;
  current_section?: string;
}

export interface StudentTransferRequest {
  to_department_id: number;
  to_semester: number;
  to_section: string;
  reason?: string;
}

/* ── API Error ── */

export interface ApiError {
  detail: string;
}

/* ── Face Recognition ── */

export interface FaceRegistrationResponse {
  success: boolean;
  face_registered: boolean;
  message: string;
}

export interface FaceStatusResponse {
  face_registered: boolean;
}

export interface RecognizedFace {
  bbox: number[];
  student_id: number | null;
  usn: string | null;
  name: string | null;
  match_score: number | null;
  recognized: boolean;
  reason: string;
}

export interface RecognitionTestResponse {
  faces: RecognizedFace[];
}

/* ── Attendance Session ── */

export interface AttendanceSessionCreate {
  semester: number;
  section: string;
  subject_id: number;
}

export interface AttendanceSession {
  id: number;
  teacher_id: number;
  department_id: number;
  semester: number;
  section: string;
  subject_id: number | null;
  date: string;
  started_at: string | null;
  submitted_at: string | null;
  status: 'active' | 'submitted' | 'terminated';
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: number;
  student_usn: string | null;
  student_name: string | null;
  subject_id: number | null;
  status: 'present' | 'absent';
  marking_method: 'manual' | 'face_recognition';
  marked_at: string | null;
}

export interface AttendanceSessionDetail extends AttendanceSession {
  records: AttendanceRecord[];
}

export interface AttendanceRecordUpdate {
  status: 'present' | 'absent';
}

export interface StudentAttendanceRecord {
  date: string;
  status: 'present' | 'absent';
  marking_method: 'manual' | 'face_recognition';
  session_id: number;
}

export interface RecognizeFrameResponse {
  recognized: {
    student_id: number;
    usn: string | null;
    name: string | null;
    score: number;
  }[];
  unknown_count: number;
  error?: string;
}

// Analytics Interfaces

export interface StudentAttendanceStats {
  student_id: number;
  usn: string;
  name: string;
  total_classes: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface TrendData {
  date: string;
  present_count: number;
  absent_count: number;
}

export interface StudentTrendData {
  date: string;
  status: string;
  session_id: number;
  subject_name?: string | null;
  subject_code?: string | null;
  teacher_name?: string | null;
}

export interface StudentAnalyticsResponse {
  total_classes: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
  history: StudentTrendData[];
}

export interface TeacherAnalyticsResponse {
  total_sessions: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
  student_stats: StudentAttendanceStats[];
  trend: TrendData[];
}

export interface SectionStats {
  semester: number;
  section: string;
  total_classes: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface HodAnalyticsResponse {
  total_sessions: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
  section_stats: SectionStats[];
  student_stats: StudentAttendanceStats[];
  trend: TrendData[];
}

export interface DepartmentStats {
  department_id: number;
  department_name: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface AdminAnalyticsResponse {
  total_departments_active: number;
  total_sessions: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
  department_stats: DepartmentStats[];
  trend: TrendData[];
}

/* ── Guardian Contacts & Parent Email Notifications ── */

export interface GuardianContact {
  id: number;
  student_id: number;
  name: string;
  email: string;
  relationship: string;
  is_active: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface GuardianContactCreate {
  name: string;
  email: string;
  relationship: string;
  is_active?: boolean;
  notifications_enabled?: boolean;
}

export interface GuardianContactUpdate {
  name?: string;
  email?: string;
  relationship?: string;
  is_active?: boolean;
  notifications_enabled?: boolean;
}

export interface EmailConfigurationStatus {
  enabled: boolean;
  provider: string;
  provider_configured: boolean;
  configuration_problem?: string | null;
  simulated: boolean;
}

export type ParentNotificationState =
  | 'pending'
  | 'sending'
  | 'simulated'
  | 'sent'
  | 'failed'
  | 'skipped';

export interface ParentNotificationItem {
  id: number;
  session_id: number;
  student_id: number;
  student_usn: string | null;
  student_name: string | null;
  department_id: number | null;
  department_name: string | null;
  subject_code: string | null;
  subject_name: string | null;
  session_date: string | null;
  semester: number | null;
  section: string | null;
  guardian_contact_id: number | null;
  recipient_email: string;
  recipient_email_masked: string;
  recipient_name: string | null;
  attendance_status: 'present' | 'absent' | string;
  event_type: 'initial' | 'correction' | string;
  state: ParentNotificationState;
  email_subject: string;
  provider: string | null;
  provider_message_id: string | null;
  attempt_count: number;
  last_error: string | null;
  retryable: boolean;
  can_retry: boolean;
  first_attempt_at: string | null;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface ParentNotificationListResponse {
  items: ParentNotificationItem[];
  total: number;
  page: number;
  page_size: number;
  email_config: EmailConfigurationStatus;
}

