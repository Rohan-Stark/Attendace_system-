import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { subjectService } from '../../services/subject.service';
import type { TeacherSubjectAssignment } from '../../services/subject.service';
import { Users, Plus, Trash2 } from 'lucide-react';
import { AssignmentForm } from './AssignmentForm';

export function AssignmentList() {
  const [assignments, setAssignments] = useState<TeacherSubjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await subjectService.getAssignments();
      setAssignments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleCreate = () => {
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchAssignments();
  };

  const handleRemove = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) return;
    
    try {
      await subjectService.removeAssignment(id);
      fetchAssignments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Teacher Assignments
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Assign subjects to teachers</p>
        </div>
        <Button onClick={handleCreate} size="md">
          <Plus className="w-4 h-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {isFormOpen ? (
        <AssignmentForm
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
            <CardDescription>Teachers and their assigned subjects</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : assignments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">No assignments found. Add an assignment to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 font-medium">Teacher</th>
                      <th className="px-6 py-3 font-medium">Subject</th>
                      <th className="px-6 py-3 font-medium">Semester</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {assignment.teacher_name || `Teacher #${assignment.teacher_id}`}
                        </td>
                        <td className="px-6 py-4">
                          {assignment.subject_name} ({assignment.subject_code})
                        </td>
                        <td className="px-6 py-4">Semester {assignment.semester}</td>
                        <td className="px-6 py-4">
                          <Badge variant={assignment.is_active ? 'success' : 'danger'}>
                            {assignment.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleRemove(assignment.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" />
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
