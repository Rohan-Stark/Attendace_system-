import io
import logging
import numpy as np
import cv2
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

class FaceRecognitionError(Exception):
    """Custom exception for face recognition errors"""
    pass

class FaceService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceService, cls).__new__(cls)
        return cls._instance

    def _initialize_model(self):
        try:
            import insightface
            from insightface.app import FaceAnalysis

            # Providers are attempted in order. If CUDA is not available, it falls back to CPU.
            providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
            self._model = FaceAnalysis(name='buffalo_l', providers=providers)
            # ctx_id=0 means use the first available context (GPU if available, else CPU)
            self._model.prepare(ctx_id=0, det_size=(640, 640))
            
            logger.info("InsightFace model 'buffalo_l' loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize face model: {e}")
            raise FaceRecognitionError(f"Model initialization failed: {e}")

    def _get_model(self):
        if self._model is None:
            self._initialize_model()
        return self._model

    def _decode_image(self, image_bytes: bytes) -> np.ndarray:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Could not decode image")
            return img
        except Exception as e:
            raise FaceRecognitionError(f"Invalid image format: {e}")

    def detect_and_embed_faces(self, image_bytes: bytes) -> List[Dict]:
        """
        Detects faces in an image and extracts embeddings.
        Returns a list of dictionaries containing bounding box, detection score, and embedding.
        """
        img = self._decode_image(image_bytes)
        try:
            faces = self._get_model().get(img)
            results = []
            for face in faces:
                results.append({
                    "bbox": face.bbox.tolist(),
                    "det_score": float(face.det_score),
                    "embedding": face.normed_embedding.tolist()  # Normalized 512-d vector
                })
            return results
        except Exception as e:
            logger.error(f"Error during face detection: {e}")
            raise FaceRecognitionError(f"Face detection failed: {e}")

    def process_registration_frames(self, frames_bytes: List[bytes]) -> List[float]:
        """
        Processes multiple frames to create a stable, averaged embedding for registration.
        Requires exactly one face per frame and a minimum quality.
        """
        if not frames_bytes:
            raise FaceRecognitionError("No frames provided for registration.")

        valid_embeddings = []

        for idx, frame in enumerate(frames_bytes):
            faces = self.detect_and_embed_faces(frame)
            
            if len(faces) == 0:
                # We can skip frames with no face or raise an error based on strictness
                logger.warning(f"Frame {idx}: No face detected.")
                continue
            
            if len(faces) > 1:
                logger.warning(f"Frame {idx}: Multiple faces detected. Skipping.")
                continue
            
            face = faces[0]
            # Basic quality checks
            if face["det_score"] < 0.6:
                logger.warning(f"Frame {idx}: Face detection score too low ({face['det_score']}). Skipping.")
                continue
                
            bbox = face["bbox"]
            width = bbox[2] - bbox[0]
            height = bbox[3] - bbox[1]
            if width < 80 or height < 80:
                logger.warning(f"Frame {idx}: Face too small ({width}x{height}). Skipping.")
                continue
                
            valid_embeddings.append(np.array(face["embedding"]))

        if not valid_embeddings:
            raise FaceRecognitionError("Could not extract a valid face from the provided frames.")

        # Calculate mean embedding
        mean_embedding = np.mean(valid_embeddings, axis=0)
        # Normalize the mean embedding
        norm = np.linalg.norm(mean_embedding)
        if norm == 0:
            raise FaceRecognitionError("Invalid mean embedding generated.")
        
        final_embedding = mean_embedding / norm
        return final_embedding.tolist()

    def compute_similarity(self, emb1: List[float], emb2: List[float]) -> float:
        """
        Computes cosine similarity between two normalized embeddings.
        Returns a float between -1.0 and 1.0.
        """
        vec1 = np.array(emb1)
        vec2 = np.array(emb2)
        return float(np.dot(vec1, vec2))

face_service = FaceService()
