import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { createStudent, updateStudent } from '../../services/hod.service';
import type { StudentResponse } from '../../types/api';

interface StudentFormProps {
  isOpen: boolean;
  onClose: (didChange: boolean) => void;
  student: StudentResponse | null;
}

export function StudentForm({ isOpen, onClose, student }: StudentFormProps) {
  const [usn, setUsn] = useState('');
  const [name, setName] = useState('');
  const [semester, setSemester] = useState('1');
  const [section, setSection] = useState('A');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [provisioningMode, setProvisioningMode] = useState<'college' | 'demo'>('college');
  
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  useEffect(() => {
    if (isOpen) {
      setUsn(student?.profile?.usn || '');
      setName(student?.profile?.name || '');
      setSemester(student?.profile?.current_semester ? String(student.profile.current_semester) : '1');
      setSection(student?.profile?.current_section || 'A');
      setError('');
      setTempPassword('');
      setInitialPassword('');
      setProvisioningMode('college');
    }
  }, [isOpen, student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (student) {
        await updateStudent(student.id, { 
          name, 
          current_semester: Number(semester), 
          current_section: section 
        });
        onClose(true);
      } else {
        const isDemo = isDemoMode && provisioningMode === 'demo';
        
        const res = await createStudent({ 
          usn, 
          name, 
          initial_password: isDemo ? undefined : initialPassword,
          generate_demo_password: isDemo,
          current_semester: Number(semester),
          current_section: section
        });
        
        if (isDemo && res.temporary_password) {
          setTempPassword(res.temporary_password);
        } else {
          onClose(true);
        }
      }
    } catch (err: any) {
      setError(err.detail || 'Failed to save student.');
    } finally {
      setIsLoading(false);
    }
  };

  if (tempPassword) {
    return (
      <Modal isOpen={isOpen} onClose={() => onClose(true)} title="Student Created Successfully">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors duration-200">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">Important!</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
              Please copy the temporary password below and securely share it with the new student.
              It will only be displayed <strong>once</strong>.
            </p>
            <div className="bg-white dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 font-mono text-center text-lg select-all text-slate-900 dark:text-slate-100 transition-colors duration-200">
              {tempPassword}
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
              Their login ID will be their USN: <strong>{usn}</strong>
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
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title={student ? 'Edit Student' : 'Add Student'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />
        
        {!student && isDemoMode && (
          <div className="flex space-x-4 mb-4">
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer transition-colors duration-200">
              <input 
                type="radio" 
                checked={provisioningMode === 'college'} 
                onChange={() => setProvisioningMode('college')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>College Credentials</span>
            </label>
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer transition-colors duration-200">
              <input 
                type="radio" 
                checked={provisioningMode === 'demo'} 
                onChange={() => setProvisioningMode('demo')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Demo Credentials</span>
            </label>
          </div>
        )}

        <Input
          label="USN (Login ID)"
          value={usn}
          onChange={(e) => setUsn(e.target.value.toUpperCase())}
          required
          disabled={!!student} 
        />
        
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        
        {!student && provisioningMode === 'college' && (
          <Input
            label="Initial Password"
            type="password"
            value={initialPassword}
            onChange={(e) => setInitialPassword(e.target.value)}
            required={!isDemoMode || provisioningMode === 'college'}
            placeholder="College-provided password"
          />
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors duration-200">Semester</label>
            <select
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              required
            >
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <Input
            label="Section"
            value={section}
            onChange={(e) => setSection(e.target.value.toUpperCase())}
            required
            maxLength={1}
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {student ? 'Save Changes' : 'Create Student'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
