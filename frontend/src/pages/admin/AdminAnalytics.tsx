import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Button } from '../../components/ui/Button';
import { analyticsService } from '../../services/analytics.service';
import { reportService } from '../../services/report.service';
import type { AdminAnalyticsResponse } from '../../types/api';
import { BarChart3, Building2, CheckCircle2, CalendarDays, Filter, Download, FileText, Printer } from 'lucide-react';

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getAdminAnalytics(
        fromDate || undefined, 
        toDate || undefined
      );
      setAnalytics(data);
      setError('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load admin analytics';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await reportService.downloadAdminCsv(fromDate || undefined, toDate || undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await reportService.downloadAdminPdf(fromDate || undefined, toDate || undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            System Analytics
          </h1>
          <p className="text-slate-500 mt-1">Global attendance statistics across all departments</p>
        </div>
        
        <div className="flex flex-col items-end gap-3 hide-on-print">
          <form onSubmit={handleFilter} className="flex items-end gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="h-9 text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="h-9 text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <Button type="submit" size="sm" className="h-9 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filter
            </Button>
          </form>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={isExporting || loading || !analytics} className="bg-white">
              <FileText className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting || loading || !analytics} className="bg-white">
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePrint} disabled={loading || !analytics}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading system analytics..." />
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg"><Building2 className="w-5 h-5 text-slate-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{analytics.total_departments_active}</p>
                    <p className="text-xs text-slate-500 font-medium">Active Departments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><CalendarDays className="w-5 h-5 text-blue-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{analytics.total_sessions}</p>
                    <p className="text-xs text-slate-500 font-medium">Total Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">{analytics.present_count}</p>
                    <p className="text-xs text-emerald-600 font-medium">Total Present</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg"><BarChart3 className="w-5 h-5 text-indigo-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-indigo-700">{analytics.attendance_percentage}%</p>
                    <p className="text-xs text-indigo-600 font-medium">Global Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Department Breakdown</CardTitle>
              <CardDescription>Compare attendance statistics across departments</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Department Name</Th>
                    <Th>Total Sessions</Th>
                    <Th>Present</Th>
                    <Th>Absent</Th>
                    <Th>Average Attendance</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {analytics.department_stats.length > 0 ? (
                    analytics.department_stats.map((dept) => (
                      <Tr key={dept.department_id}>
                        <Td><span className="font-medium text-slate-900">{dept.department_name}</span></Td>
                        <Td>{dept.total_sessions}</Td>
                        <Td><span className="text-emerald-600">{dept.present_count}</span></Td>
                        <Td><span className="text-rose-600">{dept.absent_count}</span></Td>
                        <Td>
                          <span className={`font-semibold ${dept.attendance_percentage < 75 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {dept.attendance_percentage}%
                          </span>
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr><Td colSpan={5} className="text-center py-6 text-slate-500">No departmental data found.</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
