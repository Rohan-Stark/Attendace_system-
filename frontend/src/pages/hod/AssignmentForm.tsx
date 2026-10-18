import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { subjectService } from '../../services/subject.service';
import type { Subject, TeacherSubjectAssignmentCreate } from '../../services/subject.service';
import { getTeachers } from '../../services/hod.service';
import type { TeacherResponse } from '../../types/api';

interface AssignmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AssignmentForm({ onSuccess, onCancel }: AssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_id: '',
    is_active: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [subjectsData, teachersData] = await Promise.all([
          subjectService.getSubjects(),
          getTeachers(),
        ]);
        setSubjects(subjectsData.filter(s => s.is_active));
        setTeachers(teachersData.filter(t => t.is_active));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load form data');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_id || !formData.subject_id) {
      setError('Please select both a teacher and a subject');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const createData: TeacherSubjectAssignmentCreate = {
        teacher_id: Number(formData.teacher_id),
        subject_id: Number(formData.subject_id),
        is_active: formData.is_active,
      };
      await subjectService.createAssignment(createData);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Card className="max-w-2xl border-slate-200 dark:border-slate-800">
        <CardContent className="py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>Assign Subject to Teacher</CardTitle>
        <CardDescription>
          Select a teacher and a subject to create an assignment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorMessage message={error} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="teacher_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Teacher *
              </label>
              <select
                id="teacher_id"
                required
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">Select a teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.profile?.name || `Teacher #${t.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="subject_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Subject *
              </label>
              <select
                id="subject_id"
                required
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">Select a subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - Sem {s.semester}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300">
              Active Status
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Create Assignment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
