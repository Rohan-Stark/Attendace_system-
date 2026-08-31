import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import {
  getSessionDetail,
  updateAttendanceRecord,
  submitSession,
  recognizeFrame,
} from '../../services/attendance.service';
import type { AttendanceSessionDetail, AttendanceRecord } from '../../types/api';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Camera,
  Send,
  UserCheck,
  UserX,
  ScanFace,
  Clock,
} from 'lucide-react';

export function AttendanceSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<AttendanceSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Camera / recognition
  const [showCamera, setShowCamera] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [lastRecognitionResult, setLastRecognitionResult] = useState<{
    recognized: { student_id: number; usn: string | null; name: string | null; score: number }[];
    unknown_count: number;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const data = await getSessionDetail(Number(sessionId));
      setSession(data);
      setError('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleToggleStatus = async (record: AttendanceRecord) => {
    if (!session) return;
    const newStatus = record.status === 'present' ? 'absent' : 'present';
    try {
      setTogglingId(record.student_id);
      const updated = await updateAttendanceRecord(session.id, record.student_id, { status: newStatus });
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          records: prev.records.map((r) =>
            r.student_id === record.student_id ? { ...r, ...updated } : r
          ),
        };
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update record';
      setError(message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmitSession = async () => {
    if (!session) return;
    try {
      setSubmitting(true);
      setError('');
      const updated = await submitSession(session.id);
      setSession((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit session';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch {
      setError('Could not access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setLastRecognitionResult(null);
  };

  const captureAndRecognize = async () => {
    if (!session || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        setRecognizing(true);
        setError('');
        const result = await recognizeFrame(session.id, blob);
        setLastRecognitionResult({ recognized: result.recognized, unknown_count: result.unknown_count });

        if (result.error) {
          setError(`Recognition warning: ${result.error}`);
        }

        // Refresh session to get updated attendance records
        const refreshed = await getSessionDetail(session.id);
        setSession(refreshed);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Recognition failed';
        setError(message);
      } finally {
        setRecognizing(false);
      }
    }, 'image/jpeg', 0.85);
  };

  if (loading) return <LoadingSpinner text="Loading session..." />;
  if (!session) return <ErrorMessage message={error || 'Session not found'} />;

  const presentCount = session.records.filter((r) => r.status === 'present').length;
  const absentCount = session.records.filter((r) => r.status === 'absent').length;
  const totalCount = session.records.length;
  const isSubmitted = session.status === 'submitted';

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/attendance')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>
                Semester {session.semester} — Section {session.section}
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-200">{session.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isSubmitted ? 'success' : 'info'}>
                {isSubmitted ? (
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Submitted</span>
                ) : (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Active</span>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors duration-200">
              <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200">{totalCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors duration-200">Total Students</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800 transition-colors duration-200">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 transition-colors duration-200">{presentCount}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium transition-colors duration-200">Present</p>
            </div>
            <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800 transition-colors duration-200">
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 transition-colors duration-200">{absentCount}</p>
              <p className="text-xs text-rose-600 dark:text-rose-500 font-medium transition-colors duration-200">Absent</p>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap gap-3">
            {!showCamera ? (
              <Button variant="outline" onClick={startCamera}>
                <Camera className="w-4 h-4 mr-2" /> Open Camera
              </Button>
            ) : (
              <Button variant="danger" onClick={stopCamera}>
                <Camera className="w-4 h-4 mr-2" /> Close Camera
              </Button>
            )}
            {!isSubmitted && (
              <Button onClick={handleSubmitSession} isLoading={submitting}>
                <Send className="w-4 h-4 mr-2" /> Submit Attendance
              </Button>
            )}
            {isSubmitted && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 self-center transition-colors duration-200">
                <CheckCircle2 className="w-4 h-4" />
                Submitted — modifications allowed until midnight today
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Camera Modal */}
      <Modal isOpen={showCamera} onClose={stopCamera} title="Face Recognition Camera">
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            {recognizing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <ScanFace className="w-10 h-10 text-white animate-pulse" />
                  <p className="text-white text-sm font-medium">Recognizing faces...</p>
                </div>
              </div>
            )}
          </div>

          <Button onClick={captureAndRecognize} isLoading={recognizing} disabled={recognizing} className="w-full">
            <ScanFace className="w-4 h-4 mr-2" /> Capture & Recognize
          </Button>

          {/* Recognition Results */}
          {lastRecognitionResult && (
            <div className="space-y-2">
              {lastRecognitionResult.recognized.length > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 transition-colors duration-200">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1 transition-colors duration-200">
                    Recognized ({lastRecognitionResult.recognized.length}):
                  </p>
                  <ul className="space-y-1">
                    {lastRecognitionResult.recognized.map((r) => (
                      <li key={r.student_id} className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2 transition-colors duration-200">
                        <UserCheck className="w-4 h-4" />
                        <span className="font-medium">{r.usn}</span> — {r.name}
                        <span className="text-emerald-500 dark:text-emerald-600 text-xs transition-colors duration-200">({(r.score * 100).toFixed(1)}%)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lastRecognitionResult.unknown_count > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 transition-colors duration-200">
                  <p className="text-sm text-amber-800 dark:text-amber-300 transition-colors duration-200">
                    <UserX className="w-4 h-4 inline mr-1" />
                    {lastRecognitionResult.unknown_count} unknown face(s) detected
                  </p>
                </div>
              )}
              {lastRecognitionResult.recognized.length === 0 && lastRecognitionResult.unknown_count === 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3 transition-colors duration-200">
                  <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors duration-200">No faces detected in this frame.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Attendance Table */}
      {session.records.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th>USN</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Source</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {session.records.map((record) => (
              <Tr key={record.student_id}>
                <Td>
                  <span className="font-mono text-sm">{record.student_usn || '—'}</span>
                </Td>
                <Td>{record.student_name || '—'}</Td>
                <Td>
                  <Badge variant={record.status === 'present' ? 'success' : 'danger'}>
                    {record.status === 'present' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Present
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Absent
                      </span>
                    )}
                  </Badge>
                </Td>
                <Td>
                  <Badge variant={record.marking_method === 'face_recognition' ? 'info' : 'default'}>
                    {record.marking_method === 'face_recognition' ? (
                      <span className="flex items-center gap-1">
                        <ScanFace className="w-3 h-3" /> Face
                      </span>
                    ) : (
                      'Manual'
                    )}
                  </Badge>
                </Td>
                <Td>
                  <Button
                    variant={record.status === 'present' ? 'danger' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleStatus(record)}
                    isLoading={togglingId === record.student_id}
                    disabled={togglingId === record.student_id}
                  >
                    {record.status === 'present' ? 'Mark Absent' : 'Mark Present'}
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 transition-colors duration-200">
          <CardContent>
            <div className="text-center py-8">
              <UserX className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3 transition-colors duration-200" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 transition-colors duration-200">No Students Found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-200">
                No students match this semester/section in your department.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
