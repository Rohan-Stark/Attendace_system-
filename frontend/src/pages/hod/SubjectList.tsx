import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { subjectService } from '../../services/subject.service';
import type { Subject } from '../../services/subject.service';
import { BookOpen, Plus } from 'lucide-react';
import { SubjectForm } from './SubjectForm';

export function SubjectList() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const data = await subjectService.getSubjects();
      setSubjects(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedSubject(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchSubjects();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Subject Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage academic subjects for your department</p>
        </div>
        <Button onClick={handleCreate} size="md">
          <Plus className="w-4 h-4 mr-2" />
          Add Subject
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {isFormOpen ? (
        <SubjectForm
          subject={selectedSubject}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle>Department Subjects</CardTitle>
            <CardDescription>All registered subjects</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : subjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">No subjects found. Add a subject to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 font-medium">Code</th>
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Semester</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{sub.code}</td>
                        <td className="px-6 py-4">{sub.name}</td>
                        <td className="px-6 py-4">Semester {sub.semester}</td>
                        <td className="px-6 py-4">
                          <Badge variant={sub.is_active ? 'success' : 'danger'}>
                            {sub.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(sub)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
