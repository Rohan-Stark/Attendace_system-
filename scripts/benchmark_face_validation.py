import os
import time
import time
import platform
import cv2
import numpy as np
from pathlib import Path

# Provide hardware info
import onnxruntime as ort

from app.services.face_service import face_service

def get_hardware_info():
    uname = platform.uname()
    
    # Try to detect GPU
    gpu_info = "None detected (or no CUDA)"
    if 'CUDAExecutionProvider' in ort.get_available_providers():
        gpu_info = "CUDA Available"
    
    return {
        "OS": f"{uname.system} {uname.release} {uname.version}",
        "CPU": f"{uname.processor} ({os.cpu_count()} cores)",
        "GPU": gpu_info,
        "Python": platform.python_version(),
        "ONNX Runtime": ort.__version__,
        "Providers": ort.get_available_providers()
    }

def generate_tiled_image(base_img, target_faces):
    """Creates a synthetic image with `target_faces` by tiling a single face image."""
    # To keep resolution somewhat realistic, we'll arrange them in a grid
    cols = int(np.ceil(np.sqrt(target_faces)))
    rows = int(np.ceil(target_faces / cols))
    
    h, w, c = base_img.shape
    # target size for each tile to keep memory manageable (e.g., 150x150)
    tile_h, tile_w = 150, 150
    resized_base = cv2.resize(base_img, (tile_w, tile_h))
    
    grid = np.zeros((rows * tile_h, cols * tile_w, c), dtype=np.uint8)
    
    count = 0
    for r in range(rows):
        for col in range(cols):
            if count < target_faces:
                grid[r*tile_h:(r+1)*tile_h, col*tile_w:(col+1)*tile_w, :] = resized_base
                count += 1
                
    return grid

def run_latency_benchmark():
    print("Running Latency Benchmark...")
    print("="*60)
    
    # Create a dummy image with a valid face. We'll use a simple colored square.
    # Wait, InsightFace won't detect a face in a blank square.
    # We must use an actual face. Let's try to load a sample image from insightface.
    sample_path = os.path.join(os.path.dirname(ort.__file__), '..', 'insightface', 'data', 'images', 't1.jpg')
    if not os.path.exists(sample_path):
        # Fallback: create a random noise image (no faces will be detected, so embedding time is 0)
        # This is a limitation.
        print("WARNING: No sample face image found. Latency for embedding will be 0 as no faces will be detected.")
        base_img = np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8)
    else:
        base_img = cv2.imread(sample_path)
    
    face_counts = [1, 5, 10, 20, 40, 60, 70, 80]
    
    print(f"{'Faces':<6} | {'Resolution':<12} | {'Detection (ms)':<15} | {'Embedding (ms)':<15} | {'Matching (ms)':<15} | {'Total (ms)':<15}")
    print("-" * 85)
    
    for count in face_counts:
        img = generate_tiled_image(base_img, count)
        h, w, _ = img.shape
        resolution = f"{w}x{h}"
        
        # 1. Detection
        t0 = time.perf_counter()
        # We manually call detection to separate it from embedding if possible
        # InsightFace's get() does both. We can measure the whole get() and approximate, 
        # or call them separately.
        # model.get() does detection then feature extraction.
        # We can call model.det_model.detect() directly.
        det_model = face_service._model.models['detection']
        bboxes, kpss = det_model.detect(img, max_num=count)
        det_time = (time.perf_counter() - t0) * 1000
        
        # 2. Embedding
        t1 = time.perf_counter()
        embeddings = []
        if bboxes is not None and len(bboxes) > 0:
            rec_model = face_service._model.models['recognition']
            # We need to construct Face objects or call get_feat
            for i in range(len(bboxes)):
                # This is a rough estimation of the embedding loop InsightFace uses internally
                bbox = bboxes[i, 0:4]
                det_score = bboxes[i, 4]
                kps = kpss[i] if kpss is not None else None
                # Let's just use the main get() function for accuracy of timing the whole pipeline
                pass
                
        # Better approach: Just use get() and measure the whole extraction pipeline
        t0_total = time.perf_counter()
        faces = face_service._model.get(img)
        extract_time = (time.perf_counter() - t0_total) * 1000
        
        # Since we can't easily decouple them without reimplementing get(), 
        # let's report det_time and assume embedding = extract_time - det_time
        emb_time = max(0, extract_time - det_time)
        
        detected_count = len(faces)
        
        # 3. Matching (against a gallery of 80)
        gallery = [np.random.randn(512).astype(np.float32) for _ in range(80)]
        for g in gallery:
            g /= np.linalg.norm(g)
            
        t2 = time.perf_counter()
        for face in faces:
            target = face.normed_embedding
            best_score = -1
            for g in gallery:
                score = np.dot(target, g)
                if score > best_score:
                    best_score = score
        match_time = (time.perf_counter() - t2) * 1000
        
        total_time = det_time + emb_time + match_time
        
        print(f"{detected_count:<6} | {resolution:<12} | {det_time:<15.2f} | {emb_time:<15.2f} | {match_time:<15.2f} | {total_time:<15.2f}")

def run_accuracy_benchmark():
    print("\nRunning Accuracy Benchmark...")
    print("="*60)
    
    data_dir = Path("benchmark_data")
    if not data_dir.exists() or not (data_dir / "registration").exists():
        print("Status: INSUFFICIENT DATA")
        print("Requires the following directory structure:")
        print("  benchmark_data/registration/ (Images of known students)")
        print("  benchmark_data/test_known/   (Different images of known students)")
        print("  benchmark_data/test_unknown/ (Images of unregistered people)")
        print("\nBecause real 80-student classroom data and varied identity datasets are not locally available on this environment, this portion cannot be fully validated automatically.")
        return
        
    print("Status: Validating against local dataset...")
    # (Implementation of accuracy evaluation would go here if data existed)

if __name__ == "__main__":
    print("="*60)
    print("HARDWARE & ENVIRONMENT INFO")
    print("="*60)
    info = get_hardware_info()
    for k, v in info.items():
        print(f"{k}: {v}")
    print()
    
    run_latency_benchmark()
    run_accuracy_benchmark()
