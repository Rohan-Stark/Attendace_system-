import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { getTeachers, getStudents } from '../../services/hod.service';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { BookOpen, Users } from 'lucide-react';

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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 transition-colors duration-200">HOD Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Teachers</CardTitle>
            <BookOpen className="w-5 h-5 text-blue-500 dark:text-blue-400 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-900 dark:text-white">{stats.teachers}</div>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm transition-colors duration-200">Active teachers in department</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Students</CardTitle>
            <Users className="w-5 h-5 text-emerald-500 dark:text-emerald-400 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-900 dark:text-white">{stats.students}</div>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm transition-colors duration-200">Enrolled in department</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
