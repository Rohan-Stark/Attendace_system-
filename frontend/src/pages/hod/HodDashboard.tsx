import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { getTeachers, getStudents } from '../../services/hod.service';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function HodDashboard() {
  const [stats, setStats] = useState({ teachers: 0, students: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [teachers, students] = await Promise.all([getTeachers(), getStudents()]);
        setStats({
          teachers: teachers.length,
          students: students.length,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">HOD Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{stats.teachers}</div>
            <p className="text-slate-500 mt-2 text-sm">Total teachers in department</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-600">{stats.students}</div>
            <p className="text-slate-500 mt-2 text-sm">Total students in department</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
