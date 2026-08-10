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

@router.post("/student/register", response_model=FaceRegistrationResponse)
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

@router.post("/student/reregister", response_model=FaceRegistrationResponse)
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
        
    try:
        frame_bytes_list = [await f.read() for f in frames]
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

@router.post("/test-recognition", response_model=RecognitionTestResponse)
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
        image_bytes = await image.read()
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
