import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { getTodaySessions, createSession } from '../../services/attendance.service';
import { subjectService } from '../../services/subject.service';
import type { AttendanceSession } from '../../types/api';
import type { Subject } from '../../services/subject.service';
import { ClipboardList, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';

export function AttendancePortal() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  // New session form state
  const [showForm, setShowForm] = useState(false);
  const [semester, setSemester] = useState(1);
  const [section, setSection] = useState('A');
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await getTodaySessions();
      setSessions(data);
      setError('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (sem: number) => {
    try {
      setLoadingSubjects(true);
      const data = await subjectService.getAssignedSubjects(sem);
      setAvailableSubjects(data);
      if (data.length > 0) {
        setSubjectId(data[0].id);
      } else {
        setSubjectId('');
      }
    } catch (err) {
      console.error('Failed to load subjects', err);
      setAvailableSubjects([]);
      setSubjectId('');
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (showForm) {
      fetchSubjects(semester);
    }
  }, [semester, showForm]);

  const handleCreateSession = async () => {
    if (!subjectId) {
      setError('Please select a subject');
      return;
    }
    try {
      setCreating(true);
      setError('');
      const newSession = await createSession({ semester, section, subject_id: Number(subjectId) });
      setSessions((prev) => [...prev, newSession]);
      setShowForm(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors duration-200">
            <ClipboardList className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Attendance Portal
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-200">{today}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="md">
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* New Session Form */}
      {showForm && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 transition-colors duration-200">
          <CardHeader>
            <CardTitle>Start New Attendance Session</CardTitle>
            <CardDescription>Select the class context for today's attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label htmlFor="semester-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors duration-200">
                  Semester
                </label>
                <select
                  id="semester-select"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="section-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors duration-200">
                  Section
                </label>
                <select
                  id="section-select"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200"
                >
                  {['A', 'B', 'C', 'D'].map((s) => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="subject-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors duration-200">
                  Subject {loadingSubjects && <span className="text-xs text-blue-500">(Loading...)</span>}
                </label>
                <select
                  id="subject-select"
                  value={subjectId}
                  onChange={(e) => setSubjectId(Number(e.target.value))}
                  disabled={loadingSubjects || availableSubjects.length === 0}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200 disabled:opacity-50"
                >
                  {availableSubjects.length === 0 ? (
                    <option value="">No subjects assigned</option>
                  ) : (
                    availableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex gap-2 sm:col-span-3">
                <Button onClick={handleCreateSession} isLoading={creating} disabled={creating || !subjectId}>
                  Create Session
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      {loading ? (
        <LoadingSpinner text="Loading today's sessions..." />
      ) : sessions.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 transition-colors duration-200">
          <CardContent>
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1 transition-colors duration-200">No Sessions Today</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 transition-colors duration-200">
                Create a new attendance session to get started.
              </p>
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Start Session
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-blue-300 dark:hover:border-blue-700"
              onClick={() => navigate(`/teacher/attendance/${session.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white transition-colors duration-200">
                      Sem {session.semester} — Sec {session.section}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 transition-colors duration-200">{session.date}</p>
                  </div>
                  <Badge variant={session.status === 'submitted' ? 'success' : session.status === 'terminated' ? 'danger' : 'info'}>
                    {session.status === 'submitted' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Submitted
                      </span>
                    ) : session.status === 'terminated' ? (
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Terminated
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Active
                      </span>
                    )}
                  </Badge>
                </div>
                {session.started_at && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
                    Started {new Date(session.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
