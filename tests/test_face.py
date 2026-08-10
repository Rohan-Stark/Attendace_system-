import pytest
import numpy as np
import cv2
from io import BytesIO
from fastapi.testclient import TestClient

from app.main import app
from app.services.face_service import face_service, FaceRecognitionError
from app.models.face import FaceEmbedding
from app.models.student import StudentProfile

client = TestClient(app)

def create_blank_image(width=640, height=480, color=(0, 0, 0)) -> bytes:
    """Helper to create a dummy image (e.g., all black, no face)"""
    img = np.zeros((height, width, 3), np.uint8)
    img[:] = color
    is_success, buffer = cv2.imencode(".jpg", img)
    return buffer.tobytes()

def test_face_service_initialization():
    # Model should be loaded
    assert face_service._model is not None

def test_no_face_detection():
    # Process an image with no face
    img_bytes = create_blank_image()
    faces = face_service.detect_and_embed_faces(img_bytes)
    assert len(faces) == 0

def test_process_registration_frames_no_face():
    img_bytes = create_blank_image()
    with pytest.raises(FaceRecognitionError) as exc_info:
        face_service.process_registration_frames([img_bytes, img_bytes])
    assert "Could not extract a valid face" in str(exc_info.value)

def test_similarity_calculation():
    # Test cosine similarity calculation logic
    vec1 = [1.0, 0.0, 0.0]
    vec2 = [1.0, 0.0, 0.0]
    assert face_service.compute_similarity(vec1, vec2) == 1.0
    
    vec3 = [0.0, 1.0, 0.0]
    assert face_service.compute_similarity(vec1, vec3) == 0.0
    
    vec4 = [-1.0, 0.0, 0.0]
    assert face_service.compute_similarity(vec1, vec4) == -1.0

# API Tests

def test_unauthenticated_registration():
    response = client.post("/face/student/register", files={"frames": ("test.jpg", b"dummy")})
    assert response.status_code == 401

def test_get_status_unauthenticated():
    response = client.get("/face/student/status")
    assert response.status_code == 401

# To do a full integration test with an actual face, we'd need a real face image.
# We will rely on benchmark script for true end-to-end face recognition tests with actual images.
