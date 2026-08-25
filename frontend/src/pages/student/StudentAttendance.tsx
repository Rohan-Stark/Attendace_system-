import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { analyticsService } from '../../services/analytics.service';
import { reportService } from '../../services/report.service';
import type { StudentAnalyticsResponse } from '../../types/api';
import { CalendarDays, CheckCircle2, XCircle, BarChart3, Download, FileText, Printer } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function StudentAttendance() {
  const [analytics, setAnalytics] = useState<StudentAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await analyticsService.getStudentAnalytics();
        setAnalytics(data);
        setError('');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load attendance';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const presentCount = analytics?.present_count ?? 0;
  const totalCount = analytics?.total_classes ?? 0;
  const percentage = analytics?.attendance_percentage ?? 0;
  const records = analytics?.history ?? [];

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await reportService.downloadStudentCsv();
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await reportService.downloadStudentPdf();
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-emerald-600" />
            My Attendance
          </h1>
          <p className="text-slate-500 mt-1">View your submitted attendance history</p>
        </div>
        
        <div className="flex items-center gap-2 hide-on-print">
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

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <LoadingSpinner text="Loading attendance history..." />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
                    <p className="text-xs text-slate-500 font-medium">Total Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">{presentCount}</p>
                    <p className="text-xs text-emerald-600 font-medium">Present</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <CalendarDays className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-700">{percentage}%</p>
                    <p className="text-xs text-violet-600 font-medium">Attendance Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          {records.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
                <CardDescription>
                  Only records from submitted sessions are shown.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Status</Th>
                      <Th>Marked By</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {records.map((record, index) => (
                      <Tr key={`${record.session_id}-${index}`}>
                        <Td>
                          <span className="font-medium">
                            {new Date(record.date).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </Td>
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
                          —
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-slate-300">
              <CardContent>
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-slate-700">No Attendance Records</h3>
                  <p className="text-sm text-slate-500">
                    Your attendance history will appear here once sessions are submitted by your teachers.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
