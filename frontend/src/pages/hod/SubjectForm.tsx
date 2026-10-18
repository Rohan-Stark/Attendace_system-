import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { subjectService } from '../../services/subject.service';
import type { Subject, SubjectCreate, SubjectUpdate } from '../../services/subject.service';

interface SubjectFormProps {
  subject: Subject | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SubjectForm({ subject, onSuccess, onCancel }: SubjectFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: subject?.name || '',
    code: subject?.code || '',
    semester: subject?.semester || 1,
    is_active: subject ? subject.is_active : true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (subject) {
        const updateData: SubjectUpdate = {
          name: formData.name,
          code: formData.code,
          semester: Number(formData.semester),
          is_active: formData.is_active,
        };
        await subjectService.updateSubject(subject.id, updateData);
      } else {
        const createData: SubjectCreate = {
          name: formData.name,
          code: formData.code,
          semester: Number(formData.semester),
          is_active: formData.is_active,
        };
        await subjectService.createSubject(createData);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>{subject ? 'Edit Subject' : 'Add New Subject'}</CardTitle>
        <CardDescription>
          {subject ? 'Update subject details' : 'Register a new subject for your department'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorMessage message={error} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Subject Code *
              </label>
              <input
                id="code"
                type="text"
                required
                placeholder="e.g. CSE101"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Subject Name *
              </label>
              <input
                id="name"
                type="text"
                required
                placeholder="e.g. Software Engineering"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Semester *
              </label>
              <select
                id="semester"
                required
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
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
              {subject ? 'Update Subject' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
