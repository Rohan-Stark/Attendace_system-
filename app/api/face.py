import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.core.config import settings
from app.models.user import User
from app.models.student import StudentProfile
from app.models.face import FaceEmbedding
from app.schemas.face import FaceRegistrationResponse, FaceStatusResponse, RecognitionTestResponse, RecognizedFace
from app.services.face_service import face_service, FaceRecognitionError
from app.core.rate_limit import RateLimiter

face_register_limiter = RateLimiter(max_requests=5, window_seconds=60)
face_recognition_limiter = RateLimiter(max_requests=10, window_seconds=60)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIMES = {"image/jpeg", "image/png"}

async def validate_image(file: UploadFile) -> bytes:
    """
    Validates an uploaded image file through multiple layers:
    1. Declared MIME type check
    2. File size check
    3. Actual image decode verification (prevents corrupted/fake images)
    """
    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}. Only JPEG/PNG are allowed.")
    
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
        
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds the 5MB limit.")
    
    # Actual image decode verification — do not trust MIME alone
    import numpy as np
    import cv2
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=422, detail="File could not be decoded as a valid image.")
        
    return file_bytes

router = APIRouter(prefix="/face", tags=["Face Recognition"])
logger = logging.getLogger(__name__)

@router.get("/student/status", response_model=FaceStatusResponse)
def get_face_registration_status(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """Check if the currently authenticated student has a registered face."""
    student_profile = current_user.student_profile
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    active_face = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_profile.id,
        FaceEmbedding.is_active == True
    ).first()

    return FaceStatusResponse(face_registered=active_face is not None)

@router.post("/student/register", response_model=FaceRegistrationResponse, dependencies=[Depends(face_register_limiter)])
async def register_face(
    frames: List[UploadFile] = File(...),
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """Registers a face for the authenticated student from a sequence of frames."""
    student_profile = current_user.student_profile
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Check for existing active registration
    existing_face = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_profile.id,
        FaceEmbedding.is_active == True
    ).first()

    if existing_face:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Face is already registered. Please use the re-registration flow if you need to update it."
        )

    return await _process_and_save_registration(frames, student_profile, db)

@router.post("/student/reregister", response_model=FaceRegistrationResponse, dependencies=[Depends(face_register_limiter)])
async def reregister_face(
    frames: List[UploadFile] = File(...),
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    """Updates the face registration for the authenticated student."""
    student_profile = current_user.student_profile
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # This will deactivate the old one and create a new one inside the helper
    return await _process_and_save_registration(frames, student_profile, db, is_reregister=True)

async def _process_and_save_registration(
    frames: List[UploadFile], 
    student_profile: StudentProfile, 
    db: Session,
    is_reregister: bool = False
) -> FaceRegistrationResponse:
    
    if len(frames) < 1:
        raise HTTPException(status_code=400, detail="No frames provided")
        
    frame_bytes_list = []
    for f in frames:
        try:
            f_bytes = await validate_image(f)
            frame_bytes_list.append(f_bytes)
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read image data: {e}")

    try:
        # Generate the stable embedding from frames
        embedding = face_service.process_registration_frames(frame_bytes_list)
    except FaceRecognitionError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during face processing: {e}")
        raise HTTPException(status_code=500, detail="Internal face processing error")

    # (Optional) We could do a cross-registration check here to see if `embedding`
    # is extremely close to another student's embedding to prevent duplicate identity registration.
    
    try:
        # Inside a transaction, deactivate old if re-registering, and insert new
        if is_reregister:
            db.query(FaceEmbedding).filter(
                FaceEmbedding.student_id == student_profile.id,
                FaceEmbedding.is_active == True
            ).update({"is_active": False})

        new_face = FaceEmbedding(
            student_id=student_profile.id,
            embedding=embedding,
            model_name="insightface_buffalo_l",
            is_active=True
        )
        db.add(new_face)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error during face registration: {e}")
        raise HTTPException(status_code=500, detail="Failed to save face registration")

    return FaceRegistrationResponse(
        success=True,
        face_registered=True,
        message="Face registered successfully."
    )

@router.post("/test-recognition", response_model=RecognitionTestResponse, dependencies=[Depends(face_recognition_limiter)])
async def test_recognition(
    image: UploadFile = File(...),
    current_user: User = Depends(require_role("primary_admin", "hod", "teacher")),
    db: Session = Depends(get_db)
):
    """
    Developer/Test endpoint to verify face recognition on a classroom frame.
    Requires staff role.
    """
    try:
        image_bytes = await validate_image(image)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read image")

    try:
        detected_faces = face_service.detect_and_embed_faces(image_bytes)
    except FaceRecognitionError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Load all active embeddings. For 80 students, loading into memory is fast.
    active_embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.is_active == True).all()
    
    # Pre-fetch student profiles for fast lookup
    student_dict = {}
    if active_embeddings:
        student_ids = [e.student_id for e in active_embeddings]
        profiles = db.query(StudentProfile).filter(StudentProfile.id.in_(student_ids)).all()
        student_dict = {p.id: p for p in profiles}

    threshold = settings.FACE_RECOGNITION_THRESHOLD
    results = []

    for d_face in detected_faces:
        best_match = None
        best_score = -1.0

        target_emb = d_face["embedding"]

        # Compare against all active embeddings
        for db_face in active_embeddings:
            score = face_service.compute_similarity(target_emb, db_face.embedding)
            if score > best_score:
                best_score = score
                best_match = db_face

        # Threshold check
        if best_match and best_score >= threshold:
            student = student_dict.get(best_match.student_id)
            results.append(RecognizedFace(
                bbox=d_face["bbox"],
                student_id=student.id if student else None,
                usn=student.usn if student else None,
                name=student.name if student else None,
                match_score=best_score,
                recognized=True,
                reason="recognized"
            ))
        else:
            results.append(RecognizedFace(
                bbox=d_face["bbox"],
                student_id=None,
                usn=None,
                name=None,
                match_score=best_score if best_match else None,
                recognized=False,
                reason="unknown"
            ))

    return RecognitionTestResponse(faces=results)
