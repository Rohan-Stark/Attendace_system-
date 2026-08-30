# SmartAttend System Architecture

## Overview
SmartAttend is a decoupled, API-driven web application using a modern React frontend and a FastAPI backend with PostgreSQL `pgvector` for scalable biometric attendance processing.

## 1. High-Level Flow
```
[ Frontend (React/TypeScript) ]
          │
      (REST API)
          │
[ Backend (FastAPI) ]
          │
   (InsightFace CPU) 
          │
[ PostgreSQL (pgvector) ]
```

## 2. Authentication Flow
1. User supplies credentials (email/USN and password) to `/api/v1/auth/login`.
2. Backend verifies bcrypt hashed password.
3. Backend returns a short-lived JSON Web Token (JWT) bearing the user's role and ID.
4. Frontend stores the token securely in memory/local storage and attaches it to subsequent `Authorization: Bearer <token>` requests.
5. FastAPI dependency injection (`get_current_user`, `require_role`) protects endpoints from unauthenticated or unauthorized access.

## 3. Face Registration Flow (Student)
1. Student navigates to Registration in the portal and accesses the camera.
2. A single frame is sent to `/api/v1/face/register`.
3. The `face_service.py` decodes the image in memory and uses `InsightFace` (SCRFD + ArcFace) to extract exactly 1 face.
4. The 512-dimensional embedding is saved in PostgreSQL as a `Vector(512)` column in `student_profiles`.
5. Raw images are immediately discarded from memory to preserve privacy.

## 4. Face Recognition Flow (Teacher)
1. Teacher starts an attendance session and captures a class photo.
2. Image is submitted to `/api/v1/attendance/{session_id}/recognize`.
3. `face_service.py` extracts *all* visible faces in the image.
4. For each face, the embedding is compared against the `student_profiles` vectors in PostgreSQL using cosine similarity.
5. Faces exceeding the similarity threshold are mapped to student profiles, generating tentative `attendance_records`.

## 5. Attendance Flow
1. **Creation**: Teacher creates a `class_sessions` entry marking the date, time, and subject.
2. **Recognition**: (See Flow 4).
3. **Manual Override**: Teacher can toggle `present/absent` on tentative records via the UI.
4. **Submission**: Teacher finalizes the session via `/submit`. Records are finalized.
5. **Modification**: Teacher can edit finalized records only if the current server time is the same calendar day as the session.

## 6. Analytics Flow
1. Data queries aggregate metrics grouped by Role.
2. **Students** query `AnalyticsService` to compute their attendance percentage against total sessions for their department/subject.
3. **Teachers** query sessions linked to them.
4. **HODs** query aggregates of all students within their department ID.

## 7. Report Generation Flow
1. Triggered via `/api/v1/reports/*`.
2. Queries identical datasets as analytics.
3. If CSV: Generates via `csv` dict writer in memory, returning a `StreamingResponse`.
4. If PDF: Generates via `fpdf` using standard layouts and returns a `Response(media_type="application/pdf")`.

## 8. Role / Authorization Architecture
Roles are strictly enforced via the `UserRole` enum (`admin`, `hod`, `teacher`, `student`).
Data is segregated via `department_id`.
- **HODs** can only access data where `department_id == hod.department_id`.
- **Teachers** can only create sessions in their assigned `department_id`.
- **Students** can only view their own attendance records via IDOR protections (`user_id == current_user.id`).
