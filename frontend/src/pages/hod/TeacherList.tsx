import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getTeachers, deactivateTeacher } from '../../services/hod.service';
import type { TeacherResponse } from '../../types/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TeacherForm } from './TeacherForm';

export function TeacherList() {
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherResponse | null>(null);
  
  const [deactivateDialog, setDeactivateDialog] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const data = await getTeachers();
      setTeachers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleEdit = (teacher: TeacherResponse) => {
    setEditingTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingTeacher(null);
    setIsFormOpen(true);
  };

  const handleFormClose = (didChange: boolean) => {
    setIsFormOpen(false);
    setEditingTeacher(null);
    if (didChange) fetchTeachers();
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateDialog.id) return;
    setIsDeactivating(true);
    try {
      await deactivateTeacher(deactivateDialog.id);
      fetchTeachers();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeactivating(false);
      setDeactivateDialog({ isOpen: false, id: null });
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Teachers</h1>
        <Button onClick={handleCreate}>Add Teacher</Button>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Employee ID</Th>
            <Th>Name</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {teachers.map((teacher) => (
            <Tr key={teacher.id}>
              <Td>{teacher.profile?.employee_id || '-'}</Td>
              <Td className="font-medium">{teacher.profile?.name || '-'}</Td>
              <Td><StatusBadge status={teacher.is_active} /></Td>
              <Td>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(teacher)}>
                    Edit
                  </Button>
                  {teacher.is_active && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeactivateDialog({ isOpen: true, id: teacher.id })}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
          {teachers.length === 0 && (
            <Tr>
              <Td className="text-center text-slate-500 py-8">No teachers found.</Td>
            </Tr>
          )}
        </Tbody>
      </Table>

      <TeacherForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        teacher={editingTeacher}
      />

      <ConfirmDialog
        isOpen={deactivateDialog.isOpen}
        title="Deactivate Teacher"
        message="Are you sure you want to deactivate this teacher? They will no longer be able to log in."
        confirmLabel="Deactivate"
        isDestructive
        isLoading={isDeactivating}
        onCancel={() => setDeactivateDialog({ isOpen: false, id: null })}
        onConfirm={handleDeactivateConfirm}
      />
    </div>
  );
}
