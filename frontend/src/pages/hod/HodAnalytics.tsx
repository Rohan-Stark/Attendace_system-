import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Button } from '../../components/ui/Button';
import { analyticsService } from '../../services/analytics.service';
import { reportService } from '../../services/report.service';
import type { HodAnalyticsResponse } from '../../types/api';
import { BarChart3, Building, CheckCircle2, XCircle, CalendarDays, Filter, Download, FileText, Printer } from 'lucide-react';

export function HodAnalytics() {
  const [analytics, setAnalytics] = useState<HodAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getHodAnalytics(
        fromDate || undefined, 
        toDate || undefined
      );
      setAnalytics(data);
      setError('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load department analytics';
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
      await reportService.downloadHodCsv(fromDate || undefined, toDate || undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await reportService.downloadHodPdf(fromDate || undefined, toDate || undefined);
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
            <Building className="w-7 h-7 text-indigo-600" />
            Department Analytics
          </h1>
          <p className="text-slate-500 mt-1">Attendance statistics for your department</p>
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
        <LoadingSpinner text="Loading department analytics..." />
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><CalendarDays className="w-5 h-5 text-blue-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{analytics.total_sessions}</p>
                    <p className="text-xs text-slate-500 font-medium">Department Sessions</p>
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
                  <div className="p-2 bg-rose-100 rounded-lg"><XCircle className="w-5 h-5 text-rose-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-rose-700">{analytics.absent_count}</p>
                    <p className="text-xs text-rose-600 font-medium">Total Absent</p>
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
                    <p className="text-xs text-indigo-600 font-medium">Department Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Section Averages</CardTitle>
                <CardDescription>Average attendance by semester and section</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Semester</Th>
                      <Th>Section</Th>
                      <Th>Records</Th>
                      <Th>Avg Attendance</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {analytics.section_stats.length > 0 ? (
                      analytics.section_stats.map((sec, i) => (
                        <Tr key={i}>
                          <Td>Sem {sec.semester}</Td>
                          <Td>Sec {sec.section}</Td>
                          <Td>{sec.total_classes}</Td>
                          <Td>
                            <span className={`font-semibold ${sec.attendance_percentage < 75 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {sec.attendance_percentage}%
                            </span>
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr><Td colSpan={4} className="text-center py-4 text-slate-500">No section data</Td></Tr>
                    )}
                  </Tbody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Students Below 75%</CardTitle>
                <CardDescription>Students requiring attendance review</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>USN</Th>
                      <Th>Name</Th>
                      <Th>Percentage</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {analytics.student_stats
                      .filter(s => s.attendance_percentage < 75 && s.total_classes > 0)
                      .slice(0, 10)
                      .map((student) => (
                        <Tr key={student.student_id}>
                          <Td><span className="font-medium text-xs">{student.usn}</span></Td>
                          <Td>{student.name}</Td>
                          <Td><span className="text-rose-600 font-bold">{student.attendance_percentage}%</span></Td>
                        </Tr>
                      ))}
                    {analytics.student_stats.filter(s => s.attendance_percentage < 75 && s.total_classes > 0).length === 0 && (
                      <Tr><Td colSpan={3} className="text-center py-4 text-emerald-600 font-medium">All students above 75%</Td></Tr>
                    )}
                  </Tbody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
