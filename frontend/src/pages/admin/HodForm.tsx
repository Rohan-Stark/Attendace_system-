import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { createHod, updateHod, activateHod, deactivateHod } from '../../services/admin.service';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
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

  const [statusDialog, setStatusDialog] = useState<{ isOpen: boolean; action: 'activate' | 'deactivate' }>({ isOpen: false, action: 'activate' });
  const [isStatusChanging, setIsStatusChanging] = useState(false);

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
        await updateHod(hod.id, { name, email, department_id: Number(departmentId) });
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

  const handleStatusConfirm = async () => {
    if (!hod) return;
    setIsStatusChanging(true);
    try {
      if (statusDialog.action === 'activate') {
        await activateHod(hod.id);
      } else {
        await deactivateHod(hod.id);
      }
      setStatusDialog({ isOpen: false, action: 'activate' });
      onClose(true); // Close Edit modal and refresh parent list
    } catch (err: any) {
      setError(err.detail || `Failed to ${statusDialog.action} HOD.`);
      setStatusDialog({ isOpen: false, action: 'activate' });
    } finally {
      setIsStatusChanging(false);
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
        
        {hod && (
          <div className="flex flex-col space-y-1.5 pt-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-200">Account Status</label>
            <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <span className={`font-medium ${hod.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {hod.is_active ? 'Active' : 'Inactive'}
              </span>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className={hod.is_active ? 'text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-900 dark:hover:bg-orange-900/30' : 'text-green-600 border-green-200 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-900/30'}
                onClick={() => setStatusDialog({ isOpen: true, action: hod.is_active ? 'deactivate' : 'activate' })}
              >
                {hod.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {hod ? 'Save Changes' : 'Create HOD'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={`${statusDialog.action === 'activate' ? 'Activate' : 'Deactivate'} HOD`}
        message={`Are you sure you want to ${statusDialog.action} this HOD? ${statusDialog.action === 'deactivate' ? 'They will no longer be able to log in. This action can only be undone via direct database access or this Edit menu.' : 'They will regain access to their account.'}`}
        confirmLabel={statusDialog.action === 'activate' ? 'Activate' : 'Deactivate'}
        isDestructive={statusDialog.action === 'deactivate'}
        isLoading={isStatusChanging}
        onCancel={() => setStatusDialog({ isOpen: false, action: 'activate' })}
        onConfirm={handleStatusConfirm}
      />
    </Modal>
  );
}
