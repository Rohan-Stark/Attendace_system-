# SmartAttend — Low-Level Design (LLD)

## Part 6 — Authentication LLD

- **Password Hashing**: `app.core.security.get_password_hash` (uses `passlib.context.CryptContext(schemes=["bcrypt"])`)
- **Password Verification**: `app.core.security.verify_password`
- **JWT Generation**: `app.core.security.create_access_token`
- **JWT Decoding**: `app.core.deps.get_current_user` (uses `jose.jwt.decode`)
- **Current User Dependency**: `app.core.deps.get_current_user` and `get_current_active_user`
- **Role Dependency**: `app.core.deps.require_role(*allowed_roles: str)`
- **Department Dependency**: `app.core.deps.require_department_access(department_id: int)`

**Important Function**:
- **Function**: `get_current_active_user`
- **File**: `app/core/deps.py`
- **Purpose**: Validates JWT, fetches User, ensures account is active, and enforces `must_change_password=False` for standard routes.
- **Inputs**: JWT string (via `OAuth2PasswordBearer`).
- **Outputs**: `User` SQLAlchemy model instance.
- **Security**: Prevents users with temporary passwords from accessing the system before signing up.
- **Called by**: Almost all protected API routes (e.g., `/admin/*`, `/hod/*`, `/attendance/*`).

## Part 8 — Database LLD

**Tables**:
- `users`: ID (PK), `email` (Unique), `password_hash`, `role` (Enum), `department_id` (FK), `is_active`, `must_change_password`.
- `departments`: ID (PK), `name` (Unique), `code` (Unique).
- `student_profiles`: `user_id` (PK/FK), `usn` (Unique), `semester`, `section`.
- `face_embeddings`: ID (PK), `student_id` (FK to `users.id`), `embedding` (Vector 512), `is_active`.
- `class_sessions`: ID (PK), `teacher_id` (FK), `subject_name`, `date`, `is_submitted`.
- `attendance_records`: ID (PK), `session_id` (FK), `student_id` (FK), `status` (Enum), `method` (Enum).

**Important Constraints**:
- `AttendanceRecord`: Unique constraint on `(session_id, student_id)` to prevent duplicate marking.
- `FaceEmbedding`: `embedding` column uses `VECTOR(512)`. Indexed using `hnsw` or `ivfflat` (handled via Alembic/pgvector).

## Part 10 — Face Registration LLD

**Workflow**:
1. Student accesses Face Registration page (`frontend/src/pages/student/FaceRegistration.tsx`).
2. Browser captures 5 consecutive frames (images) using webcam via `<video>`/`<canvas>`.
3. Images are sent as a multipart/form-data POST request to `POST /face/student/register`.
4. `app.api.face.register_face` receives the frames.
5. Passes frames to `app.services.face_service.FaceService.register_face()`.
6. **Validation**: Checks if a face is detected in each frame. Rejects if multiple faces or no faces are detected.
7. **Aggregation**: Extracts 512-D embeddings from each frame, averages them, and normalizes (L2 norm) the resulting aggregate embedding for stability.
8. **Storage**: Saves the normalized vector to `face_embeddings` table.

## Part 12 — Attendance LLD

**Endpoints**:
- **Create Session**: `POST /attendance/sessions`
- **Upload Image (Recognition)**: `POST /attendance/sessions/{session_id}/recognize` (Processes image, returns matches, does NOT commit final attendance immediately).
- **Manual Marking**: `POST /attendance/sessions/{session_id}/records` (Upserts a specific student's record).
- **Submission**: `POST /attendance/sessions/{session_id}/submit` (Sets `is_submitted = True`).

**Business Rules Enforced**:
1. **Manual Correction**: Teacher can upsert records via the manual marking endpoint.
2. **Same-Day Modification**: `app.api.attendance` checks `if session.is_submitted and session.date < current_date: raise HTTPException(...)`.
3. **Analytics Integrity**: Analytics service strictly queries `where(ClassSession.is_submitted == True)`.
4. **Historical Survival**: Student transfers log the move, but attendance records remain tied to the `session_id` and `student_id`, completely unaffected by current department.

## Part 16 — Security LLD

- **JWT Validation**: `app/core/deps.py` -> `get_current_user()`
- **Password Hashing**: `app/core/security.py` -> `get_password_hash()` and `verify_password()`
- **Rate Limiter**: `app/core/rate_limit.py` -> `RateLimiter` class (Token Bucket algorithm, stored in-memory dictionary).
- **Security Headers**: `app/main.py` -> `add_security_headers` middleware (adds XSS Protection, CSP, Frame-Options).
- **CORS**: `app/main.py` -> `CORSMiddleware`.
- **Upload Validation**: Handled in API routes (e.g., `app/api/face.py` checks file size via `len(await file.read())`).
- **IDOR Protection**: `require_department_access` checks `if current_user.department_id != target_department: raise 403`.

## Part 18 — Frontend LLD

- **Routing**: `frontend/src/App.tsx`. Uses `react-router-dom`.
- **Protection**: `frontend/src/components/ProtectedRoute.tsx` enforces `allowedRoles`.
- **API Client**: `frontend/src/lib/api-client.ts` centralizes `fetch` calls, attaches JWT, and handles 401 token expiration.
- **State**: Centralized `AuthProvider` (`useAuth`) manages the JWT, role, and current user profile in React Context.

**Major Components**:
- **Admin**: `AdminDashboard.tsx`, `DepartmentList.tsx`, `HodList.tsx`, `AdminAnalytics.tsx`.
- **HOD**: `HodDashboard.tsx`, `TeacherList.tsx`, `StudentList.tsx`, `HodAnalytics.tsx`.
- **Teacher**: `TeacherDashboard.tsx`, `AttendancePortal.tsx` (Session list), `AttendanceSession.tsx` (Image upload + manual corrections).
- **Student**: `StudentDashboard.tsx`, `StudentAttendance.tsx`, `FaceRegistration.tsx`.
- **Auth**: `LoginPage.tsx`, `SignupPage.tsx`.

## Part 19 — API Architecture

**Authentication (`/auth`)**:
- `POST /login`: Authenticates, returns JWT.
- `POST /first-time-signup`: Sets initial permanent password.
- `POST /change-password`: Authenticated password update.
- `GET /me`: Returns profile.

**Admin (`/admin`)**:
- `GET /departments`, `POST /departments`: Dept management.
- `GET /hods`, `POST /hods`: HOD management.

**HOD (`/hod`)**:
- `GET /teachers`, `POST /teachers`: Teacher management.
- `GET /students`, `POST /students`: Student management.
- `POST /students/{id}/transfer`: Dept transfer.

**Face (`/face`)**:
- `POST /student/register`: Live face registration.
- `GET /student/status`: Check if face registered.

**Attendance (`/attendance`)**:
- `POST /sessions`: Create class session.
- `POST /sessions/{id}/recognize`: Biometric recognition via image.
- `POST /sessions/{id}/records`: Manual upsert.
- `POST /sessions/{id}/submit`: Finalize session.

**Analytics & Reports**:
- `GET /analytics/dashboard`: Role-scoped statistics.
- `GET /reports/download`: Returns CSV or PDF blob.

## Part 20 — End-to-End Data Flows

**Flow 2: Teacher Attendance**
1. Teacher clicks "Create Session" in `AttendancePortal.tsx`.
2. Frontend POSTs to `/attendance/sessions`. Backend creates row in `class_sessions`.
3. Teacher navigates to `AttendanceSession.tsx` and selects an image file.
4. Frontend POSTs `multipart/form-data` to `/attendance/sessions/{id}/recognize`.
5. Backend reads image, extracts faces via InsightFace, computes cosine distances against `face_embeddings` in pgvector.
6. Backend creates/updates `AttendanceRecord`s as "Present" for matches. Returns results.
7. Teacher manually toggles a student absent/present in the UI, firing POST to `/attendance/sessions/{id}/records`.
8. Teacher clicks "Submit Session", firing POST `/attendance/sessions/{id}/submit`. Backend sets `is_submitted = True`.

## Part 21 — Error Handling
- **Invalid Credentials**: Returns `401 Unauthorized`.
- **Unauthorized Role**: `require_role` returns `403 Forbidden`.
- **Unauthorized Dept**: `require_department_access` returns `403 Forbidden`.
- **No Face Detected**: Face Service raises `ValueError("No face detected")`, API catches and returns `400 Bad Request`.
- **Unexpected Error**: Global exception handler (`app.main.global_exception_handler`) catches unhandled exceptions, logs traceback, and returns a generic `500 Internal Server Error` to avoid leaking stack traces.
