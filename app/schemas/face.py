from pydantic import BaseModel
from typing import List, Optional

class FaceRegistrationResponse(BaseModel):
    success: bool
    face_registered: bool
    message: str

class FaceStatusResponse(BaseModel):
    face_registered: bool

class RecognizedFace(BaseModel):
    bbox: List[float]
    student_id: Optional[int] = None
    usn: Optional[str] = None
    name: Optional[str] = None
    match_score: Optional[float] = None
    recognized: bool
    reason: str

class RecognitionTestResponse(BaseModel):
    faces: List[RecognizedFace]
