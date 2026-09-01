import { get, post, patch } from '../lib/api-client';
import type {
  AttendanceSession,
  AttendanceSessionCreate,
  AttendanceSessionDetail,
  AttendanceRecord,
  AttendanceRecordUpdate,
  StudentAttendanceRecord,
  RecognizeFrameResponse,
} from '../types/api';

/** Create a new attendance session for today */
export function createSession(body: AttendanceSessionCreate): Promise<AttendanceSession> {
  return post<AttendanceSession>('/attendance/sessions', body);
}

/** Get all of the current teacher's sessions for today */
export function getTodaySessions(): Promise<AttendanceSession[]> {
  return get<AttendanceSession[]>('/attendance/sessions/today');
}

/** Get session detail including full attendance list */
export function getSessionDetail(sessionId: number): Promise<AttendanceSessionDetail> {
  return get<AttendanceSessionDetail>(`/attendance/sessions/${sessionId}`);
}

/** Upload a camera frame for face recognition within a session */
export function recognizeFrame(sessionId: number, frame: Blob): Promise<RecognizeFrameResponse> {
  const formData = new FormData();
  formData.append('frame', frame, 'frame.jpg');
  return post<RecognizeFrameResponse>(`/attendance/sessions/${sessionId}/recognize-frame`, formData);
}

/** Manually update a student's attendance status */
export function updateAttendanceRecord(
  sessionId: number,
  studentId: number,
  body: AttendanceRecordUpdate
): Promise<AttendanceRecord> {
  return patch<AttendanceRecord>(`/attendance/sessions/${sessionId}/records/${studentId}`, body);
}

/** Submit the attendance session */
export function submitSession(sessionId: number): Promise<AttendanceSession> {
  return post<AttendanceSession>(`/attendance/sessions/${sessionId}/submit`);
}

/** Terminate the attendance session */
export function terminateSession(sessionId: number): Promise<AttendanceSession> {
  return post<AttendanceSession>(`/attendance/sessions/${sessionId}/terminate`);
}

/** Student: view own attendance history */
export function getStudentAttendance(): Promise<StudentAttendanceRecord[]> {
  return get<StudentAttendanceRecord[]>('/student/attendance');
}
