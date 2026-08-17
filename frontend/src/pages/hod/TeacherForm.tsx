import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { createTeacher, updateTeacher } from '../../services/hod.service';
import type { TeacherResponse } from '../../types/api';

interface TeacherFormProps {
  isOpen: boolean;
  onClose: (didChange: boolean) => void;
  teacher: TeacherResponse | null;
}

export function TeacherForm({ isOpen, onClose, teacher }: TeacherFormProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmployeeId(teacher?.profile?.employee_id || '');
      setName(teacher?.profile?.name || '');
      setError('');
      setTempPassword('');
    }
  }, [isOpen, teacher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (teacher) {
        await updateTeacher(teacher.id, { employee_id: employeeId, name });
        onClose(true);
      } else {
        const res = await createTeacher({ employee_id: employeeId, name });
        setTempPassword(res.temporary_password);
        // Don't close immediately to show password
      }
    } catch (err: any) {
      setError(err.detail || 'Failed to save teacher.');
    } finally {
      setIsLoading(false);
    }
  };

  if (tempPassword) {
    return (
      <Modal isOpen={isOpen} onClose={() => onClose(true)} title="Teacher Created Successfully">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-semibold text-amber-800 mb-2">Important!</h4>
            <p className="text-sm text-amber-700 mb-2">
              Please copy the temporary password below and securely share it with the new teacher.
              It will only be displayed <strong>once</strong>.
            </p>
            <div className="bg-white p-3 rounded border font-mono text-center text-lg select-all">
              {tempPassword}
            </div>
            <p className="text-sm text-amber-700 mt-2">
              Their login ID will be their Employee ID: <strong>{employeeId}</strong>
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onClose(true)}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title={teacher ? 'Edit Teacher' : 'Add Teacher'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />
        
        <Input
          label="Employee ID (Login ID)"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          required
          disabled={!!teacher} // Cannot edit login ID easily
        />
        
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {teacher ? 'Save Changes' : 'Create Teacher'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
