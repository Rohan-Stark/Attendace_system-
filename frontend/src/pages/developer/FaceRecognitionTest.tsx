import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { testRecognition } from '../../services/face.service';
import type { RecognizedFace } from '../../types/api';

export function FaceRecognitionTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [results, setResults] = useState<RecognizedFace[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setResults(null);
      setError('');
      
      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const handleTest = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError('');
    
    try {
      const res = await testRecognition(selectedFile);
      setResults(res.faces);
      drawResults(res.faces);
    } catch (err: any) {
      setError(err.detail || 'Recognition failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const drawResults = (faces: RecognizedFace[]) => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const img = imageRef.current;
    
    // Ensure canvas size matches image display size
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    faces.forEach((face) => {
      const [x1, y1, x2, y2] = face.bbox;
      const x = x1 * scaleX;
      const y = y1 * scaleY;
      const width = (x2 - x1) * scaleX;
      const height = (y2 - y1) * scaleY;
      
      // Box color based on recognition status
      ctx.strokeStyle = face.recognized ? '#10b981' : '#f43f5e'; // emerald or rose
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Background for text
      ctx.fillStyle = face.recognized ? '#10b981' : '#f43f5e';
      ctx.fillRect(x, y - 24, width, 24);
      
      // Text
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      
      const label = face.recognized 
        ? `${face.name || face.usn} (${(face.match_score! * 100).toFixed(1)}%)`
        : 'Unknown';
        
      ctx.fillText(label, x + width/2, y - 6, width - 4);
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Developer Tool: Face Recognition Benchmark</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Recognition Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <Button 
              onClick={handleTest} 
              disabled={!selectedFile || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Run Recognition'}
            </Button>
          </div>
          
          {error && <div className="text-rose-600 text-sm font-medium">{error}</div>}
          
          {imagePreview && (
            <div className="relative border rounded overflow-hidden bg-slate-100 inline-block">
              <img 
                ref={imageRef}
                src={imagePreview} 
                alt="Test" 
                className="max-h-[600px] object-contain"
                onLoad={() => {
                  if (results) drawResults(results);
                }}
              />
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
              />
            </div>
          )}
          
          {results && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Results: {results.length} faces detected</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {results.map((r, i) => (
                  <div key={i} className={`p-2 rounded border ${r.recognized ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <div className="font-medium">{r.recognized ? r.name : 'Unknown'}</div>
                    <div className="text-xs text-slate-500">
                      Score: {r.match_score ? r.match_score.toFixed(3) : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
