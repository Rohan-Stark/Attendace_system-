import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { createDepartment, updateDepartment } from '../../services/admin.service';
import type { Department } from '../../types/api';

interface DepartmentFormProps {
  isOpen: boolean;
  onClose: (didChange: boolean) => void;
  department: Department | null;
}

export function DepartmentForm({ isOpen, onClose, department }: DepartmentFormProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(department?.name || '');
      setCode(department?.code || '');
      setError('');
    }
  }, [isOpen, department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (department) {
        await updateDepartment(department.id, { name, code });
      } else {
        await createDepartment({ name, code });
      }
      onClose(true);
    } catch (err: any) {
      setError(err.detail || 'Failed to save department.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title={department ? 'Edit Department' : 'Add Department'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />
        
        <Input
          label="Department Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Computer Science"
        />
        
        <Input
          label="Department Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          placeholder="e.g. CS"
        />
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
