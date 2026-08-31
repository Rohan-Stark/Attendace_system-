import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getStudents, removeStudent } from '../../services/hod.service';
import type { StudentResponse } from '../../types/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StudentForm } from './StudentForm';
import { StudentTransferDialog } from './StudentTransferDialog';
import { Input } from '../../components/ui/Input';

export function StudentList() {
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [usn, setUsn] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentResponse | null>(null);
  
  const [transferDialog, setTransferDialog] = useState<{ isOpen: boolean; student: StudentResponse | null }>({ isOpen: false, student: null });
  
  const [removeDialog, setRemoveDialog] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getStudents({
        semester: semester ? Number(semester) : undefined,
        section: section || undefined,
        usn: usn || undefined,
      });
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [semester, section, usn]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleEdit = (student: StudentResponse) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingStudent(null);
    setIsFormOpen(true);
  };

  const handleTransfer = (student: StudentResponse) => {
    setTransferDialog({ isOpen: true, student });
  };

  const handleFormClose = (didChange: boolean) => {
    setIsFormOpen(false);
    setEditingStudent(null);
    if (didChange) fetchStudents();
  };

  const handleTransferClose = (didChange: boolean) => {
    setTransferDialog({ isOpen: false, student: null });
    if (didChange) fetchStudents();
  };

  const handleRemoveConfirm = async () => {
    if (!removeDialog.id) return;
    setIsRemoving(true);
    try {
      await removeStudent(removeDialog.id);
      fetchStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemoving(false);
      setRemoveDialog({ isOpen: false, id: null });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200">Students</h1>
        <Button onClick={handleCreate}>Add Student</Button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-wrap gap-4 items-end transition-colors duration-200">
        <Input 
          label="USN Filter" 
          value={usn} 
          onChange={(e) => setUsn(e.target.value)} 
          className="w-full sm:w-48"
        />
        <div className="flex flex-col space-y-1.5 w-full sm:w-32">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-200">Semester</label>
          <select
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option value="">All</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <Input 
          label="Section Filter" 
          value={section} 
          onChange={(e) => setSection(e.target.value)} 
          className="w-full sm:w-32"
          maxLength={1}
        />
        <Button variant="secondary" onClick={() => { setUsn(''); setSemester(''); setSection(''); }}>
          Clear Filters
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>USN</Th>
              <Th>Name</Th>
              <Th>Sem/Sec</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {students.map((student) => (
              <Tr key={student.id}>
                <Td className="font-mono">{student.profile?.usn || '-'}</Td>
                <Td className="font-medium">{student.profile?.name || '-'}</Td>
                <Td>{student.profile?.current_semester} / {student.profile?.current_section}</Td>
                <Td><StatusBadge status={student.profile?.status || 'unknown'} /></Td>
                <Td>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}>
                      Edit
                    </Button>
                    {student.profile?.status === 'active' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleTransfer(student)}>
                          Transfer
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          onClick={() => setRemoveDialog({ isOpen: true, id: student.id })}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {students.length === 0 && (
              <Tr>
                <Td colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-8">No students found matching filters.</Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      )}

      <StudentForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        student={editingStudent}
      />

      {transferDialog.student && (
        <StudentTransferDialog
          isOpen={transferDialog.isOpen}
          onClose={handleTransferClose}
          student={transferDialog.student}
        />
      )}

      <ConfirmDialog
        isOpen={removeDialog.isOpen}
        title="Remove Student"
        message="Are you sure you want to mark this student as removed? They will no longer be able to log in or be assigned to new classes."
        confirmLabel="Remove"
        isDestructive
        isLoading={isRemoving}
        onCancel={() => setRemoveDialog({ isOpen: false, id: null })}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}
