import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getFaceStatus } from '../../services/face.service';
import { CheckCircle2, XCircle, CalendarDays } from 'lucide-react';

export function StudentDashboard() {
  const navigate = useNavigate();
  const [faceRegistered, setFaceRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    getFaceStatus()
      .then((res) => setFaceRegistered(res.face_registered))
      .catch((err) => console.error("Failed to fetch face status:", err));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Student Portal</h1>
      
      {/* Biometric Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Biometric Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center space-x-3">
              {faceRegistered === true ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Face Registered</h3>
                    <p className="text-sm text-slate-500">Your face is actively registered for attendance.</p>
                  </div>
                </>
              ) : faceRegistered === false ? (
                <>
                  <XCircle className="w-8 h-8 text-rose-500" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Face Not Registered</h3>
                    <p className="text-sm text-slate-500">You must register your face to be marked present.</p>
                  </div>
                </>
              ) : (
                <div className="animate-pulse flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-32" />
                    <div className="h-3 bg-slate-200 rounded w-48" />
                  </div>
                </div>
              )}
            </div>
            
            {faceRegistered !== null && (
              <Button 
                variant={faceRegistered ? "outline" : "primary"}
                onClick={() => navigate('/student/face-registration')}
              >
                {faceRegistered ? "Re-register Face" : "Register Face"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Card */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            My Attendance
          </CardTitle>
          <CardDescription>
            View your attendance history and overall attendance rate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/student/attendance')}>
            <CalendarDays className="w-4 h-4 mr-2" />
            View Attendance
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
