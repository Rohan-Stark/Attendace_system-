import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { registerFace, reregisterFace } from '../../services/face.service';
import { Camera, CheckCircle, Loader2 } from 'lucide-react';

export function FaceRegistration() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      setError('Could not access camera. Please grant permissions.');
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const captureFrames = async () => {
    if (!videoRef.current || !isCameraActive) return;
    setIsCapturing(true);
    setError('');
    
    const frames: Blob[] = [];
    const numFrames = 5;
    
    try {
      for (let i = 0; i < numFrames; i++) {
        setProgress(((i) / numFrames) * 100);
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to create blob'));
            }, 'image/jpeg', 0.9);
          });
          frames.push(blob);
        }
        // Wait a bit between frames
        await new Promise((r) => setTimeout(r, 400));
      }
      setProgress(100);
      
      // Attempt registration
      // If student is re-registering, this will fail if we only use `registerFace` and they have one active.
      // We could try `registerFace` and if it fails with 400 "Face is already registered", try `reregisterFace`.
      // For simplicity here, we'll try register, catch the 400, and show a button for re-register,
      // or we just call reregister if we passed a prop. 
      // Let's just use `registerFace` and handle the error gracefully.
      try {
        await registerFace(frames);
        setSuccess(true);
        stopCamera();
      } catch (regErr: any) {
        if (regErr.status === 400 && regErr.detail?.includes('already registered')) {
            // Automatically try reregistration
            await reregisterFace(frames);
            setSuccess(true);
            stopCamera();
        } else {
            throw regErr;
        }
      }
      
    } catch (err: any) {
      setError(err.detail || 'Failed to register face. Please try again.');
      setProgress(0);
    } finally {
      setIsCapturing(false);
    }
  };

  // Cleanup on unmount
  useCallback(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200">Face Registration</h1>
        <Button variant="outline" onClick={() => navigate('/student')}>Back to Dashboard</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register Your Face</CardTitle>
          <CardDescription>
            This biometric data is securely stored and used exclusively for automated attendance tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 text-emerald-600 dark:text-emerald-400 transition-colors duration-200">
              <CheckCircle size={64} />
              <h2 className="text-2xl font-semibold">Registration Successful</h2>
              <p className="text-slate-600 dark:text-slate-400 text-center transition-colors duration-200">Your face has been securely registered in the system.</p>
              <Button onClick={() => navigate('/student')} className="mt-4">Return to Dashboard</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <ErrorMessage message={error} />
              
              {!isCameraActive ? (
                <div className="flex flex-col items-center p-8 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg transition-colors duration-200">
                  <Camera size={48} className="text-slate-400 dark:text-slate-500 mb-4 transition-colors duration-200" />
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-center max-w-md transition-colors duration-200">
                    Please ensure you are in a well-lit area, looking directly at the camera, and your face is not obscured.
                  </p>
                  <Button onClick={startCamera}>Start Camera</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`h-full w-full object-cover ${isCapturing ? 'opacity-80' : 'opacity-100'}`}
                    />
                    
                    {/* Face Guide Overlay */}
                    <div className="absolute inset-0 border-[6px] border-black/30 flex items-center justify-center pointer-events-none">
                       <div className="w-1/3 h-2/3 border-4 border-dashed border-white/60 rounded-full" />
                    </div>

                    {isCapturing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                         <Loader2 className="animate-spin text-white w-12 h-12 mb-4" />
                         <span className="text-white font-medium text-lg">Capturing... {Math.round(progress)}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-blue-800 dark:text-blue-300 text-sm transition-colors duration-200">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Center your face in the oval guide</li>
                      <li>Look directly at the camera</li>
                      <li>Hold still during capture</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={stopCamera} disabled={isCapturing}>Cancel</Button>
                    <Button onClick={captureFrames} disabled={isCapturing}>
                      {isCapturing ? 'Processing...' : 'Capture & Register'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
