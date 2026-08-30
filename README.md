# SMARTATTEND

SmartAttend is a modern, facial-recognition-based attendance management system built for educational institutions. It automates attendance tracking securely, accurately, and reliably.

## 1. Project Overview
SmartAttend streamlines the process of marking attendance, enabling teachers to capture a live classroom image to automatically register student attendance based on facial embeddings. 

## 2. Main Features
- **Facial Recognition Attendance**: Mark attendance for an entire classroom securely via a single image upload.
- **Hierarchical Access**: Dedicated dashboards for Admins, HODs, Teachers, and Students.
- **Role-Based Analytics**: Attendance metrics broken down by individual, session, and department.
- **Extensive Reporting**: Generate and export reports in PDF and CSV format.
- **Security-First**: Built with robust rate-limiting, JWT authentication, and strict RBAC isolated by department.

## 3. System Architecture
SmartAttend is a decoupled application using a FastAPI backend and a React/TypeScript frontend. It stores structural data and face embeddings in PostgreSQL (using `pgvector`).

## 4. Technology Stack
- **Backend:** Python, FastAPI, SQLAlchemy, Alembic, insightface (Face embeddings)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Database:** PostgreSQL with `pgvector` extension

## 5. Role-Based Access
- **Admin**: Manages global departments and creates Head of Department (HOD) accounts.
- **HOD**: Manages teachers and students within a specific assigned department.
- **Teacher**: Creates and manages attendance sessions for assigned classes.
- **Student**: Registers their face data securely and tracks their own attendance record.

## 6. Face Recognition Architecture
The backend uses **InsightFace** (ArcFace) to generate 512-dimensional facial embeddings. Embeddings are stored efficiently in `pgvector`. Cosine similarity is computed directly inside the database to identify multiple faces in a single attendance image. *Raw images are never persisted.*

## 7. Attendance Workflow
1. Teacher selects a subject and creates an active session.
2. Teacher uploads a live classroom photo.
3. System identifies students and returns a tentative present list.
4. Teacher can manually adjust the list before final submission.
5. Corrections can be made on the same calendar day, but locked thereafter.

## 8. Analytics
- **Students**: See their overall attendance and subject-wise metrics.
- **Teachers**: View attendance patterns and class engagement statistics.
- **HODs/Admins**: Can visualize departmental attendance trends.

## 9. Reports
Teachers, HODs, and Admins can export detailed historical data (CSV or PDF) for auditing or accreditation purposes.

## 10. Security
- Tokens are short-lived.
- Image uploads are strictly validated by MIME, extension, and content logic.
- File sizes are capped and rate limiting shields sensitive endpoints from brute-force attempts.
- Passwords follow robust bcrypt hashing.
- API endpoints strictly reject Cross-Department Object Reference (IDOR) attempts.

## 11. Demo Mode
For demonstration without a live mailer or organization credentials, `DEMO_MODE=True` allows creation of test student and teacher accounts with simplified flows.

## 12. Installation Requirements
- Docker and Docker Compose
- Node.js (v18+)
- Python (3.11+)

## 13. Environment Setup
1. Clone the repository.
2. Copy `backend/.env.example` to `backend/.env` and update necessary keys.
3. Copy `frontend/.env.example` to `frontend/.env`.

## 14. Database Setup
```bash
docker-compose up -d
```

## 15. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

## 16. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 17. Running the Application
Access the frontend at `http://localhost:5173`. Access API docs at `http://localhost:8000/docs`.

## 18. Running Tests
```bash
cd backend
pytest tests/ -v
```

## 19. Building Frontend
```bash
cd frontend
npm run build
```

## 20. Docker Usage
For a fully containerized environment (if provided), simply run `docker-compose up --build`.

## 21. Project Structure
- `backend/`: FastAPI application, routers, services, database models, alembic migrations.
- `frontend/`: React Vite application, pages, components, API client.
- `docs/`: In-depth architecture and handoff documents.

## 22. Known Limitations
- **Capacity**: Target capacity of 70–80 students with 90-95% accuracy requires formal environmental validation; currently relies on standard test sets.
- **Latency**: CPU-only model extraction for dense images takes longer; scaling may require GPU nodes.
- **Rate-Limiting**: Currently implemented using in-memory structures, which is not suitable for horizontal scaling out of the box (requires Redis for multi-instance deployments).

## 23. Future Improvements
- Implement GPU offloading for InsightFace.
- Integrate Redis for robust multi-node rate limiting and token blocking.
- Add live webcam direct integration via WebRTC.
