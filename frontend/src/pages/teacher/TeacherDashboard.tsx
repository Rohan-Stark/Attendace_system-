import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ClipboardList } from 'lucide-react';

export function TeacherDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Teacher Portal</h1>

      {/* Attendance Card */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Attendance Management
          </CardTitle>
          <CardDescription>
            Create sessions, mark attendance via face recognition or manually, and submit records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/teacher/attendance')}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Open Attendance Portal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Phases */}
      <Card className="bg-blue-50 border-blue-200 border-dashed border-2">
        <CardHeader>
          <CardTitle className="text-blue-800">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700">
            Subjects, Timetables, Analytics, and Reports will be available in future phases.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
