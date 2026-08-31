import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { getDepartments, getHods } from '../../services/admin.service';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Building2, Users } from 'lucide-react';

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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 transition-colors duration-200">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Departments</CardTitle>
            <Building2 className="w-5 h-5 text-blue-500 dark:text-blue-400 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-900 dark:text-white">{stats.departments}</div>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm transition-colors duration-200">Registered across system</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total HODs</CardTitle>
            <Users className="w-5 h-5 text-emerald-500 dark:text-emerald-400 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-900 dark:text-white">{stats.hods}</div>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm transition-colors duration-200">Active Heads of Department</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
