# SmartAttend — High-Level Design (HLD)

## 3.1 System Purpose
SmartAttend is an automated, facial-recognition-based attendance management system built for educational institutions.
- **Primary Users**: System Administrators, Heads of Departments (HODs), Teachers, and Students.
- **Primary Problem**: Replaces manual, time-consuming roll calls with a fast, secure, and verifiable biometric attendance process.
- **Major Capabilities**: Role-based access control, biometric face registration, automated attendance marking via classroom image uploads, manual corrections, role-scoped analytics, and PDF/CSV reporting.

## 3.2 System Architecture
The actual architecture is a **Client-Server / Modular Architecture**.
- **Frontend**: A React Single Page Application (SPA) built with Vite, TypeScript, and Tailwind CSS.
- **API**: A Python FastAPI backend providing RESTful endpoints.
- **Business Services**: Python services handling authentication, face recognition, attendance logic, and analytics.
- **ORM / Data Access**: SQLAlchemy ORM for database interactions.
- **Database**: PostgreSQL with the `pgvector` extension for storing and querying 512-D face embeddings.

**Flow**:
Browser (React) → API (FastAPI) → Business Services → ORM (SQLAlchemy) → PostgreSQL + pgvector

## 3.3 Architectural Components
- **Frontend**: Renders role-specific dashboards. Communicates with API via JWT-authenticated requests.
- **Backend API**: Routes incoming HTTP requests to appropriate services, enforces JWT authorization and rate limits.
- **Authentication**: Stateless JWT-based authentication. Manages login, first-time signup, password changes, and resets.
- **Authorization**: Enforces strict Role-Based Access Control (RBAC) and department-level data isolation.
- **Face Recognition**: Uses `insightface` (buffalo_l, ArcFace, SCRFD) to extract 512-D embeddings from uploaded images.
- **Attendance**: Manages class sessions, compares detected faces against the `pgvector` database via cosine similarity, and stores attendance records.
- **Analytics & Reporting**: Generates role-scoped statistics (CSV/PDF) using SQL aggregations.
- **Database**: PostgreSQL storing structured data (Users, Departments) and vector data (FaceEmbeddings).
- **Security**: Rate limiting, password hashing (bcrypt), CORS, IDOR protection, input validation.
- **Docker**: Containerizes the PostgreSQL database with the pgvector extension for reproducible deployments.

## 3.4 Deployment Architecture
- **Browser**: Executes the React/Vite frontend. Captures images (webcam) and sends them to the backend.
- **FastAPI Backend**: Runs natively or in a container, processing API requests.
- **Face Recognition Processing**: Executed **entirely on the Backend** using CPU (InsightFace/ONNX). The browser only captures and uploads images.
- **PostgreSQL + pgvector**: Hosted in a Docker container (`smartattend-db`), storing all relational and vector data.

## 3.5 Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | React 19.x, TypeScript, Vite, TailwindCSS, React Router |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy, Pydantic, python-jose (JWT), passlib (bcrypt), InsightFace, OpenCV, NumPy |
| **Database** | PostgreSQL 16, pgvector |
| **Infrastructure** | Docker, Docker Compose, Alembic (Migrations) |
| **Testing** | pytest, pytest-asyncio, HTTPX |

## Part 4 — Role Architecture

- **Primary Admin**: Created manually or via seed script. Can manage Departments and HODs, view global analytics.
- **HOD**: Provisioned by Admin. Restricted to their department. Can manage Teachers and Students in their department, view department analytics.
- **Teacher**: Provisioned by HOD. Can create attendance sessions, upload images for recognition, manually correct attendance (same-day), view personal analytics.
- **Student**: Provisioned by HOD. Can register their face (biometrics), view own attendance, and personal analytics.

**Permissions Matrix**:
| Feature | Admin | HOD | Teacher | Student |
|---------|-------|-----|---------|---------|
| Departments | ✅ | ❌ | ❌ | ❌ |
| HOD Management | ✅ | ❌ | ❌ | ❌ |
| Teacher Management | ❌ | ✅ | ❌ | ❌ |
| Student Management | ❌ | ✅ | ❌ | ❌ |
| Face Registration | ❌ | ❌ | ❌ | ✅ |
| Face Recognition | ❌ | ❌ | ✅ | ❌ |
| Attendance (View) | ✅ | ✅ | ✅ | ✅ (Own only) |
| Manual Attendance | ❌ | ❌ | ✅ (Own classes) | ❌ |
| Analytics | ✅ (All) | ✅ (Dept) | ✅ (Own classes) | ✅ (Own) |
| Reports | ✅ | ✅ | ✅ | ✅ |
| Password Management | ✅ | ✅ | ✅ | ✅ |

## Part 5 — Authentication HLD

**Flow**:
1. **Provisioning**: Account created by Admin/HOD with temporary password and `must_change_password=True`.
2. **First Login / Sign Up**: User visits `/signup`, enters ID, temporary password, and new password. Backend updates hash and clears `must_change_password`.
3. **Login**: User posts credentials to `/auth/login`.
4. **JWT**: Backend verifies bcrypt hash and issues a JWT containing `sub` (user_id), `role`, and `department_id`.
5. **Storage**: Frontend stores JWT in `sessionStorage` (or memory/localStorage via `api-client`).
6. **Protected Routes**: Frontend includes `Bearer <token>` in Authorization header. Backend `get_current_active_user` validates token signature, expiration, and active status.
7. **Logout**: Frontend discards the token.

## Part 7 — Database HLD

**Core Tables & Relationships**:
- `users`: Base table for all accounts. Stores email, password_hash, role, and `department_id`.
- `departments`: Represents academic departments. Has one-to-many relationship with `users`.
- `student_profiles`: Extends `users` for students (USN, semester, section).
- `face_embeddings`: Stores 512-D `pgvector` embeddings linked to a `User` (student).
- `class_sessions`: Created by a Teacher (User). Represents a single lecture/class.
- `attendance_records`: Links a `ClassSession` and a Student (`User`), storing attendance status (present/absent) and method (face/manual).
- `student_transfers`: Audit log of students moving between departments.
- `password_reset_tokens`: Stores hashed tokens for password recovery.

**ER-Style Flow**:
```text
Department (1) ---> (M) User (Admin, HOD, Teacher, Student)
User (Student) (1) ---> (1) StudentProfile
User (Student) (1) ---> (M) FaceEmbedding
User (Teacher) (1) ---> (M) ClassSession
ClassSession (1) ---> (M) AttendanceRecord
User (Student) (1) ---> (M) AttendanceRecord
```

## Part 9 — Face Recognition HLD

**Biometric Pipeline**:
1. **Camera/Image**: Teacher captures classroom image via browser.
2. **Face Detection**: Backend uses InsightFace (SCRFD) to detect bounding boxes.
3. **Face Alignment**: Detected faces are cropped and aligned.
4. **Embedding Generation**: ArcFace (buffalo_l) generates a 512-dimensional vector.
5. **Database Match**: The 512-D vector is compared against registered student embeddings in PostgreSQL using `pgvector`'s cosine distance operator (`<=>`).
6. **Thresholding**: Matches below the distance threshold (e.g., 0.4) are identified.
7. **Attendance**: Identified students are marked "Present (Face Recognition)".

**Limitations**:
The system currently relies on CPU execution for InsightFace. The theoretical capacity is 70–80 simultaneous students, but this has **not been validated** using a representative real-world classroom dataset.

## Part 11 — Attendance HLD

**Attendance Lifecycle**:
1. **Creation**: Teacher creates a `ClassSession` (subject, semester, section).
2. **Recognition**: Teacher captures/uploads an image. The backend processes faces and creates tentative `AttendanceRecord`s.
3. **Manual Correction**: Teacher reviews the list, marks unrecognized students manually, or corrects false positives.
4. **Submission**: Teacher finalizes the session (`is_submitted = True`).
5. **Locking**: Once submitted, modifications are only permitted on the **same calendar day**. Next-day modifications are blocked.
6. **Visibility**: Students can only view finalized (submitted) attendance. Analytics strictly exclude unsubmitted sessions.

## Part 13 — Analytics HLD
- **Data Source**: SQL queries aggregating `class_sessions` and `attendance_records`.
- **Filtering**: Strictly filters by `is_submitted = True`.
- **Role Isolation**: 
  - Admin: Global aggregation.
  - HOD: Filtered by `department_id`.
  - Teacher: Filtered by `teacher_id`.
  - Student: Filtered by `student_id`.
- **Calculations**: Standard `(present / total) * 100`, handling division-by-zero securely in SQL or Python.

## Part 14 — Reporting HLD
- **Service**: `ReportService` extracts identical data used by Analytics.
- **Export Formats**: Uses `csv` module for CSV and `fpdf2` for PDF generation.
- **Read-Only**: Reports are strictly read-only and enforce the same RBAC and department-isolation rules as the Analytics API.

## Part 15 — Security HLD

**Security Flow**:
Request → Rate Limiter → JWT Validation (`get_current_active_user`) → Role Check (`require_role`) → Department Check (`require_department_access`) → Input Validation (Pydantic) → Business Logic → Database → Response.

- **Rate Limiting**: Custom token-bucket rate limiter per IP/Route.
- **IDOR Protection**: Users can only query data matching their own ID or Department ID.
- **Password Hashing**: `passlib` with `bcrypt`.
- **Headers**: Middleware injects `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`.
