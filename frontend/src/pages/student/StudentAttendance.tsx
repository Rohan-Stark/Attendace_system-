import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { getStudentAttendance } from '../../services/attendance.service';
import type { StudentAttendanceRecord } from '../../types/api';
import { CalendarDays, CheckCircle2, XCircle, ScanFace, BarChart3 } from 'lucide-react';

export function StudentAttendance() {
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getStudentAttendance();
        setRecords(data);
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

  const presentCount = records.filter((r) => r.status === 'present').length;
  const totalCount = records.length;
  const percentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-emerald-600" />
          My Attendance
        </h1>
        <p className="text-slate-500 mt-1">View your submitted attendance history</p>
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
                          <Badge variant={record.marking_method === 'face_recognition' ? 'info' : 'default'}>
                            {record.marking_method === 'face_recognition' ? (
                              <span className="flex items-center gap-1">
                                <ScanFace className="w-3 h-3" /> Face Recognition
                              </span>
                            ) : (
                              'Manual'
                            )}
                          </Badge>
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
