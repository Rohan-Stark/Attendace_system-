import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Button } from '../../components/ui/Button';
import { analyticsService } from '../../services/analytics.service';
import { reportService } from '../../services/report.service';
import type { TeacherAnalyticsResponse } from '../../types/api';
import { BarChart3, Users, CheckCircle2, XCircle, CalendarDays, Filter, Download, FileText, Printer } from 'lucide-react';

export function TeacherAnalytics() {
  const [analytics, setAnalytics] = useState<TeacherAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getTeacherAnalytics(
        fromDate || undefined, 
        toDate || undefined
      );
      setAnalytics(data);
      setError('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load teacher analytics';
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
      await reportService.downloadTeacherCsv(fromDate || undefined, toDate || undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await reportService.downloadTeacherPdf(fromDate || undefined, toDate || undefined);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
            <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Class Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-200">Attendance statistics for your classes</p>
        </div>
        
        <div className="flex flex-col items-end gap-3 hide-on-print">
          <form onSubmit={handleFilter} className="flex items-end gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors duration-200">From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="h-9 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors duration-200">To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="h-9 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200" />
            </div>
            <Button type="submit" size="sm" className="h-9 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filter
            </Button>
          </form>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={isExporting || loading || !analytics} className="bg-white dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 transition-colors duration-200">
              <FileText className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting || loading || !analytics} className="bg-white dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 transition-colors duration-200">
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
        <LoadingSpinner text="Loading analytics..." />
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg transition-colors duration-200"><CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200">{analytics.total_sessions}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors duration-200">Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors duration-200"><Users className="w-5 h-5 text-slate-600 dark:text-slate-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200">{analytics.total_records}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors duration-200">Total Records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg transition-colors duration-200"><CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 transition-colors duration-200">{analytics.present_count}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium transition-colors duration-200">Present</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg transition-colors duration-200"><XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 transition-colors duration-200">{analytics.absent_count}</p>
                    <p className="text-xs text-rose-600 dark:text-rose-500 font-medium transition-colors duration-200">Absent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg transition-colors duration-200"><BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 transition-colors duration-200">{analytics.attendance_percentage}%</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-500 font-medium transition-colors duration-200">Overall Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Attendance Summary</CardTitle>
              <CardDescription>Aggregated attendance per student across your sessions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>USN</Th>
                    <Th>Name</Th>
                    <Th>Classes</Th>
                    <Th>Present</Th>
                    <Th>Absent</Th>
                    <Th>Percentage</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {analytics.student_stats.length > 0 ? (
                    analytics.student_stats.map((student) => (
                      <Tr key={student.student_id}>
                        <Td><span className="font-medium text-slate-900 dark:text-white transition-colors duration-200">{student.usn}</span></Td>
                        <Td><span className="text-slate-900 dark:text-slate-300 transition-colors duration-200">{student.name}</span></Td>
                        <Td>{student.total_classes}</Td>
                        <Td><span className="text-emerald-600 dark:text-emerald-400 font-medium transition-colors duration-200">{student.present_count}</span></Td>
                        <Td><span className="text-rose-600 dark:text-rose-400 font-medium transition-colors duration-200">{student.absent_count}</span></Td>
                        <Td>
                          <span className={`font-semibold transition-colors duration-200 ${student.attendance_percentage < 75 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {student.attendance_percentage}%
                          </span>
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={6} className="text-center py-6 text-slate-500 dark:text-slate-400 transition-colors duration-200">
                        No student attendance data found for this period.
                      </Td>
                    </Tr>
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
