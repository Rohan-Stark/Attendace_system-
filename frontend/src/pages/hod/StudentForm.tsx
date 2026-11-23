import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import {
  createStudent,
  updateStudent,
  getStudentGuardians,
  createStudentGuardian,
  updateStudentGuardian,
  deleteStudentGuardian,
} from '../../services/hod.service';
import type { StudentResponse, GuardianContact } from '../../types/api';

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

  // Guardian Contacts state (when editing an existing student)
  const [guardians, setGuardians] = useState<GuardianContact[]>([]);
  const [guardiansLoading, setGuardiansLoading] = useState(false);
  const [guardianError, setGuardianError] = useState('');
  const [guardianSuccess, setGuardianSuccess] = useState('');
  const [editingGuardianId, setEditingGuardianId] = useState<number | null>(null);
  const [gName, setGName] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gRelationship, setGRelationship] = useState('Parent');
  const [gIsActive, setGIsActive] = useState(true);
  const [gNotificationsEnabled, setGNotificationsEnabled] = useState(true);
  const [gSaving, setGSaving] = useState(false);

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  const resetGuardianForm = useCallback(() => {
    setEditingGuardianId(null);
    setGName('');
    setGEmail('');
    setGRelationship('Parent');
    setGIsActive(true);
    setGNotificationsEnabled(true);
  }, []);

  const fetchGuardians = useCallback(async (studentId: number) => {
    setGuardiansLoading(true);
    setGuardianError('');
    try {
      const list = await getStudentGuardians(studentId);
      setGuardians(list);
    } catch (err: any) {
      setGuardianError(err.detail || 'Failed to load guardian contacts.');
    } finally {
      setGuardiansLoading(false);
    }
  }, []);

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
      setGuardianError('');
      setGuardianSuccess('');
      resetGuardianForm();

      if (student) {
        fetchGuardians(student.id);
      } else {
        setGuardians([]);
      }
    }
  }, [isOpen, student, fetchGuardians, resetGuardianForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (student) {
        await updateStudent(student.id, {
          name,
          current_semester: Number(semester),
          current_section: section,
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
          current_section: section,
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

  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setGuardianError('');
    setGuardianSuccess('');
    setGSaving(true);

    try {
      if (editingGuardianId) {
        await updateStudentGuardian(student.id, editingGuardianId, {
          name: gName.trim(),
          email: gEmail.trim(),
          relationship: gRelationship.trim() || 'Guardian',
          is_active: gIsActive,
          notifications_enabled: gNotificationsEnabled,
        });
        setGuardianSuccess('Guardian contact updated.');
      } else {
        await createStudentGuardian(student.id, {
          name: gName.trim(),
          email: gEmail.trim(),
          relationship: gRelationship.trim() || 'Guardian',
          is_active: gIsActive,
          notifications_enabled: gNotificationsEnabled,
        });
        setGuardianSuccess('Guardian contact added.');
      }
      resetGuardianForm();
      await fetchGuardians(student.id);
    } catch (err: any) {
      setGuardianError(err.detail || 'Failed to save guardian contact.');
    } finally {
      setGSaving(false);
    }
  };

  const handleStartEditGuardian = (g: GuardianContact) => {
    setGuardianError('');
    setGuardianSuccess('');
    setEditingGuardianId(g.id);
    setGName(g.name);
    setGEmail(g.email);
    setGRelationship(g.relationship);
    setGIsActive(g.is_active);
    setGNotificationsEnabled(g.notifications_enabled);
  };

  const handleToggleGuardianPrefs = async (
    g: GuardianContact,
    field: 'is_active' | 'notifications_enabled',
    value: boolean
  ) => {
    if (!student) return;
    setGuardianError('');
    setGuardianSuccess('');
    try {
      await updateStudentGuardian(student.id, g.id, { [field]: value });
      await fetchGuardians(student.id);
    } catch (err: any) {
      setGuardianError(err.detail || 'Failed to update guardian preferences.');
    }
  };

  const handleDeleteGuardian = async (guardianId: number) => {
    if (!student) return;
    setGuardianError('');
    setGuardianSuccess('');
    try {
      await deleteStudentGuardian(student.id, guardianId);
      if (editingGuardianId === guardianId) {
        resetGuardianForm();
      }
      setGuardianSuccess('Guardian contact removed.');
      await fetchGuardians(student.id);
    } catch (err: any) {
      setGuardianError(err.detail || 'Failed to remove guardian contact.');
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
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
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
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
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

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {student ? 'Save Student Details' : 'Create Student'}
            </Button>
          </div>
        </form>

        {student && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Parent / Guardian Contacts
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage parent or guardian email recipients for attendance notifications.
              </p>
            </div>

            <ErrorMessage message={guardianError} />
            {guardianSuccess && (
              <div className="p-2.5 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {guardianSuccess}
              </div>
            )}

            {guardiansLoading ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading guardian contacts...</p>
            ) : guardians.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                No guardian contacts configured for this student.
              </p>
            ) : (
              <div className="space-y-2">
                {guardians.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col gap-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {g.name}{' '}
                          <span className="font-normal text-slate-500 dark:text-slate-400">
                            ({g.relationship})
                          </span>
                        </div>
                        <div className="font-mono text-slate-600 dark:text-slate-300">{g.email}</div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEditGuardian(g)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                          onClick={() => handleDeleteGuardian(g.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 pt-1 border-t border-slate-200/70 dark:border-slate-800">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={g.is_active}
                          onChange={(e) => handleToggleGuardianPrefs(g, 'is_active', e.target.checked)}
                        />
                        <span>Active</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={g.notifications_enabled}
                          onChange={(e) =>
                            handleToggleGuardianPrefs(g, 'notifications_enabled', e.target.checked)
                          }
                        />
                        <span>Email Notifications Enabled</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSaveGuardian}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {editingGuardianId ? 'Edit Guardian Contact' : 'Add Guardian Contact'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Guardian Name"
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  required
                  placeholder="e.g. Rajesh Kumar"
                />
                <Input
                  label="Relationship"
                  value={gRelationship}
                  onChange={(e) => setGRelationship(e.target.value)}
                  required
                  placeholder="Father / Mother / Guardian"
                />
              </div>
              <Input
                label="Guardian Email"
                type="email"
                value={gEmail}
                onChange={(e) => setGEmail(e.target.value)}
                required
                placeholder="parent@example.com"
              />
              <div className="flex items-center space-x-4 text-xs text-slate-700 dark:text-slate-300">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gIsActive}
                    onChange={(e) => setGIsActive(e.target.checked)}
                  />
                  <span>Active</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gNotificationsEnabled}
                    onChange={(e) => setGNotificationsEnabled(e.target.checked)}
                  />
                  <span>Notifications Enabled</span>
                </label>
              </div>
              <div className="flex justify-end space-x-2">
                {editingGuardianId && (
                  <Button type="button" variant="ghost" size="sm" onClick={resetGuardianForm}>
                    Cancel Edit
                  </Button>
                )}
                <Button type="submit" size="sm" isLoading={gSaving}>
                  {editingGuardianId ? 'Update Guardian' : 'Add Guardian'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}
