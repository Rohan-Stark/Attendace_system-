import { get, post } from '../lib/api-client';
import type { 
  FaceRegistrationResponse, 
  FaceStatusResponse, 
  RecognitionTestResponse 
} from '../types/api';

export async function getFaceStatus(): Promise<FaceStatusResponse> {
  return get<FaceStatusResponse>('/face/student/status');
}

export async function registerFace(frames: Blob[]): Promise<FaceRegistrationResponse> {
  const formData = new FormData();
  frames.forEach((frame, index) => {
    formData.append('frames', frame, `frame_${index}.jpg`);
  });

  return post<FaceRegistrationResponse>('/face/student/register', formData);
}

export async function reregisterFace(frames: Blob[]): Promise<FaceRegistrationResponse> {
  const formData = new FormData();
  frames.forEach((frame, index) => {
    formData.append('frames', frame, `frame_${index}.jpg`);
  });

  return post<FaceRegistrationResponse>('/face/student/reregister', formData);
}

export async function testRecognition(image: Blob): Promise<RecognitionTestResponse> {
  const formData = new FormData();
  formData.append('image', image, 'test.jpg');
  
  return post<RecognitionTestResponse>('/face/test-recognition', formData);
}
