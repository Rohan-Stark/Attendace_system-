import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { getDepartments, getHods } from '../../services/admin.service';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminDashboard() {
  const [stats, setStats] = useState({ departments: 0, hods: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [deps, hodsList] = await Promise.all([getDepartments(), getHods()]);
        setStats({
          departments: deps.length,
          hods: hodsList.length,
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
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{stats.departments}</div>
            <p className="text-slate-500 mt-2 text-sm">Total departments registered</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>HODs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-600">{stats.hods}</div>
            <p className="text-slate-500 mt-2 text-sm">Total Heads of Department</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
