import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { transferStudent } from '../../services/hod.service';
import { getDepartments } from '../../services/admin.service';
import type { StudentResponse, Department } from '../../types/api';

interface StudentTransferDialogProps {
  isOpen: boolean;
  onClose: (didChange: boolean) => void;
  student: StudentResponse;
}

export function StudentTransferDialog({ isOpen, onClose, student }: StudentTransferDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
  const [targetSemester, setTargetSemester] = useState('1');
  const [targetSection, setTargetSection] = useState('A');
  const [reason, setReason] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDepts, setIsFetchingDepts] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTargetSemester(student.profile?.current_semester ? String(student.profile.current_semester) : '1');
      setTargetSection(student.profile?.current_section || 'A');
      setReason('');
      setError('');
      
      const fetchDepts = async () => {
        setIsFetchingDepts(true);
        try {
          const depts = await getDepartments();
          // Filter out current department
          setDepartments(depts.filter(d => d.id !== student.department_id));
        } catch (err: any) {
          setError('Failed to load departments.');
        } finally {
          setIsFetchingDepts(false);
        }
      };
      
      fetchDepts();
    }
  }, [isOpen, student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDepartmentId) {
      setError('Please select a target department.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await transferStudent(student.id, {
        to_department_id: Number(targetDepartmentId),
        to_semester: Number(targetSemester),
        to_section: targetSection,
        reason: reason || undefined
      });
      onClose(true);
    } catch (err: any) {
      setError(err.detail || 'Failed to transfer student.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title="Transfer Student">
      <div className="mb-4 text-sm text-slate-600 bg-blue-50 p-3 rounded border border-blue-100">
        Transferring student <strong>{student.profile?.name} ({student.profile?.usn})</strong> to another department. 
        This will move all their data and remove them from your current department view.
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />
        
        <div className="flex flex-col space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Target Department</label>
          <select
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
            value={targetDepartmentId}
            onChange={(e) => setTargetDepartmentId(e.target.value)}
            required
            disabled={isFetchingDepts}
          >
            <option value="" disabled>
              {isFetchingDepts ? 'Loading...' : 'Select Target Department'}
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Target Semester</label>
            <select
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={targetSemester}
              onChange={(e) => setTargetSemester(e.target.value)}
              required
            >
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <Input
            label="Target Section"
            value={targetSection}
            onChange={(e) => setTargetSection(e.target.value.toUpperCase())}
            required
            maxLength={1}
          />
        </div>
        
        <Input
          label="Reason for Transfer (Optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Branch change"
        />
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} variant="primary">
            Confirm Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
