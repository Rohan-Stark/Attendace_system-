# SmartAttend Database Architecture

SmartAttend utilizes PostgreSQL as its primary datastore, heavily leveraging the `pgvector` extension for storing and querying high-dimensional facial embeddings.

## Key Relationships
- `users` (Admin, HOD, Teacher, Student) are the core entity. 
- `users` link to a `departments` entity.
- `student_profiles` expands on the `users` table to track USNs and face embeddings.
- `class_sessions` track when a teacher initiates an attendance event.
- `attendance_records` link `class_sessions` to `users` (students).

## Entities

### `users`
- Stores all authentication materials (`email`, `hashed_password`).
- Distinguishes access levels via `role` (Enum: `admin`, `hod`, `teacher`, `student`).
- Enforces a `department_id` foreign key for HODs, Teachers, and Students. Admins typically have `department_id = NULL`.
- `is_active` boolean for soft-disabling accounts.

### `departments`
- Simple taxonomy table storing `name` and `description`.
- Enforces uniqueness on the `name`.

### `student_profiles`
- One-to-one relationship with `users` where `role == student`.
- Tracks `usn` (University Seat Number) for academic reporting.
- Tracks `face_embedding`: `Vector(512)` column.
- Tracks `face_registered`: Boolean flag for fast UI verification.
- Enforces an index on `face_embedding` if IVF/HNSW indexing is enabled in Postgres.

### `class_sessions`
- Created by a teacher.
- Tracks `teacher_id` (User FK), `department_id` (Department FK).
- Stores session metadata: `date`, `time`, `subject`, `semester`, `section`.
- Tracks `status` (Enum: `pending`, `submitted`).

### `attendance_records`
- Child of `class_sessions` (Many-to-One).
- Child of `users` (student) (Many-to-One).
- Stores the `status` (Enum: `present`, `absent`).
- Optionally stores `confidence_score` if identified via facial recognition.
- Note: Attendance records remain linked to the student's User ID, preserving historical data even if they transfer departments.

### `student_transfers`
- Audit log of students moving between departments.
- Tracks `student_id`, `from_department_id`, `to_department_id`, and `transfer_date`.

### `audit_logs`
- Generic safety table.
- Tracks `actor_user_id`, `action` (string), `target_entity`, `target_id`, and a JSON `details` payload.
- Automatically populated by critical security routes (e.g. transfers, deletions, modifications).

### `password_reset_tokens`
- Handles forgot-password flow.
- Tracks cryptographically generated token hashes.
- Tracks `expires_at` and `used_at` to enforce single-use and expiry mechanics.
