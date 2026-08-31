import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getHods, getDepartments, removeHod, resetHodPassword } from '../../services/admin.service';
import type { HODResponse, Department } from '../../types/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { HodForm } from './HodForm';

export function HodList() {
  const [hods, setHods] = useState<HODResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHod, setEditingHod] = useState<HODResponse | null>(null);
  


  const [removeDialog, setRemoveDialog] = useState<{ isOpen: boolean; hod: HODResponse | null }>({ isOpen: false, hod: null });
  const [isRemoving, setIsRemoving] = useState(false);

  const [resetDialog, setResetDialog] = useState<{ isOpen: boolean; hod: HODResponse | null }>({ isOpen: false, hod: null });
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState<{ isOpen: boolean; tempPassword: string }>({ isOpen: false, tempPassword: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [hodsData, deptsData] = await Promise.all([getHods(), getDepartments()]);
      setHods(hodsData);
      setDepartments(deptsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (hod: HODResponse) => {
    setEditingHod(hod);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingHod(null);
    setIsFormOpen(true);
  };

  const handleFormClose = (didChange: boolean) => {
    setIsFormOpen(false);
    setEditingHod(null);
    if (didChange) fetchData();
  };



  const handleRemoveConfirm = async () => {
    if (!removeDialog.hod) return;
    setIsRemoving(true);
    try {
      await removeHod(removeDialog.hod.id);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemoving(false);
      setRemoveDialog({ isOpen: false, hod: null });
    }
  };

  const handleResetConfirm = async () => {
    if (!resetDialog.hod) return;
    setIsResetting(true);
    try {
      const res = await resetHodPassword(resetDialog.hod.id);
      setResetSuccessData({ isOpen: true, tempPassword: res.temporary_password });
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
      setResetDialog({ isOpen: false, hod: null });
    }
  };

  const getDeptName = (deptId: number) => {
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : `ID: ${deptId}`;
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-200">Heads of Department</h1>
        <Button onClick={handleCreate}>Add HOD</Button>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Department</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {hods.map((hod) => (
            <Tr key={hod.id}>
              <Td className="font-medium">{hod.name || '-'}</Td>
              <Td>{hod.email}</Td>
              <Td>{getDeptName(hod.department_id)}</Td>
              <Td><StatusBadge status={hod.is_active} /></Td>
              <Td>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(hod)}>
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={() => setResetDialog({ isOpen: true, hod })}
                  >
                    Reset Password
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => setRemoveDialog({ isOpen: true, hod })}
                  >
                    Remove
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
          {hods.length === 0 && (
            <Tr>
              <Td colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-8">No HODs found.</Td>
            </Tr>
          )}
        </Tbody>
      </Table>

      <HodForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        hod={editingHod}
        departments={departments}
      />



      <ConfirmDialog
        isOpen={removeDialog.isOpen}
        title="Remove HOD?"
        message={`Name: ${removeDialog.hod?.name || '-'}\nEmail: ${removeDialog.hod?.email}\n\nThis will permanently delete the HOD account. This action cannot be undone.`}
        confirmLabel="Remove Permanently"
        isDestructive
        isLoading={isRemoving}
        onCancel={() => setRemoveDialog({ isOpen: false, hod: null })}
        onConfirm={handleRemoveConfirm}
      />

      <ConfirmDialog
        isOpen={resetDialog.isOpen}
        title="Reset HOD Password"
        message={`You are about to reset the password for:\n\nName: ${resetDialog.hod?.name || '-'}\nEmail: ${resetDialog.hod?.email}\n\nThe existing password will become invalid.\nA temporary password will be generated.\nThe HOD will be required to create a new password after the next login.`}
        confirmLabel="Reset Password"
        isDestructive={false}
        isLoading={isResetting}
        onCancel={() => setResetDialog({ isOpen: false, hod: null })}
        onConfirm={handleResetConfirm}
      />

      <Modal isOpen={resetSuccessData.isOpen} onClose={() => setResetSuccessData({ isOpen: false, tempPassword: '' })} title="Password Reset Successfully">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors duration-200">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">Important!</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
              Please copy the temporary password below and securely share it with the HOD.
              It will only be displayed <strong>once</strong>.
            </p>
            <div className="bg-white dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 font-mono text-center text-lg select-all text-slate-900 dark:text-slate-100 transition-colors duration-200">
              {resetSuccessData.tempPassword}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setResetSuccessData({ isOpen: false, tempPassword: '' })}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
