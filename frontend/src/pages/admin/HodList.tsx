import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getHods, getDepartments, deactivateHod } from '../../services/admin.service';
import type { HODResponse, Department } from '../../types/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { HodForm } from './HodForm';

export function HodList() {
  const [hods, setHods] = useState<HODResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHod, setEditingHod] = useState<HODResponse | null>(null);
  
  const [deactivateDialog, setDeactivateDialog] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [isDeactivating, setIsDeactivating] = useState(false);

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

  const handleDeactivateConfirm = async () => {
    if (!deactivateDialog.id) return;
    setIsDeactivating(true);
    try {
      await deactivateHod(deactivateDialog.id);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeactivating(false);
      setDeactivateDialog({ isOpen: false, id: null });
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
        <h1 className="text-2xl font-bold text-slate-900">Heads of Department</h1>
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
                  {hod.is_active && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeactivateDialog({ isOpen: true, id: hod.id })}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
          {hods.length === 0 && (
            <Tr>
              <Td className="text-center text-slate-500 py-8">No HODs found.</Td>
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
        isOpen={deactivateDialog.isOpen}
        title="Deactivate HOD"
        message="Are you sure you want to deactivate this HOD? They will no longer be able to log in. This action can only be undone via direct database access."
        confirmLabel="Deactivate"
        isDestructive
        isLoading={isDeactivating}
        onCancel={() => setDeactivateDialog({ isOpen: false, id: null })}
        onConfirm={handleDeactivateConfirm}
      />
    </div>
  );
}
