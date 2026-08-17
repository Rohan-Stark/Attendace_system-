# SmartAttend

SmartAttend is a college attendance management system with AI-based face recognition.

## Phase 1 Overview

This repository currently contains the infrastructure and development foundation (Phase 1) for SmartAttend.
It includes:
- A Vite + React + TypeScript frontend skeleton.
- A FastAPI Python backend skeleton.
- A PostgreSQL database configured with the `pgvector` extension via Docker Compose.
- A placeholder for the future `face-service`.

## Running the Application Locally

### 1. Database Setup

Ensure Docker is installed and running, then start the PostgreSQL instance:

```bash
docker-compose up -d
```

### 2. Backend Setup

The backend requires Python 3.10+ (recommended).

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
The backend health check will be available at `http://localhost:8000/health`.

### 3. Frontend Setup

The frontend requires Node.js.

```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`.
