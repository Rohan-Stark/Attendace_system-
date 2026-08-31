import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { createHod, updateHod } from '../../services/admin.service';
import type { HODResponse, Department } from '../../types/api';

interface HodFormProps {
  isOpen: boolean;
  onClose: (didChange: boolean) => void;
  hod: HODResponse | null;
  departments: Department[];
}

export function HodForm({ isOpen, onClose, hod, departments }: HodFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(hod?.email || '');
      setName(hod?.name || '');
      setDepartmentId(hod?.department_id ? String(hod.department_id) : '');
      setError('');
      setTempPassword('');
    }
  }, [isOpen, hod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) {
      setError('Please select a department.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      if (hod) {
        await updateHod(hod.id, { name, department_id: Number(departmentId) });
        onClose(true);
      } else {
        const res = await createHod({ email, name, department_id: Number(departmentId) });
        setTempPassword(res.temporary_password);
        // Don't close immediately, show the password
      }
    } catch (err: any) {
      setError(err.detail || 'Failed to save HOD.');
    } finally {
      setIsLoading(false);
    }
  };

  if (tempPassword) {
    return (
      <Modal isOpen={isOpen} onClose={() => onClose(true)} title="HOD Created Successfully">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors duration-200">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">Important!</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
              Please copy the temporary password below and securely share it with the new HOD.
              It will only be displayed <strong>once</strong>.
            </p>
            <div className="bg-white dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 font-mono text-center text-lg select-all text-slate-900 dark:text-slate-100 transition-colors duration-200">
              {tempPassword}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onClose(true)}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title={hod ? 'Edit HOD' : 'Add HOD'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />
        
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={!!hod} // Cannot edit email after creation
        />
        
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        
        <div className="flex flex-col space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-200">Department</label>
          <select
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            required
          >
            <option value="" disabled>Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {hod ? 'Save Changes' : 'Create HOD'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
