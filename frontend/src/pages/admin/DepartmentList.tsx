import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { getDepartments } from '../../services/admin.service';
import type { Department } from '../../types/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { DepartmentForm } from './DepartmentForm';

export function DepartmentList() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingDept(null);
    setIsFormOpen(true);
  };

  const handleFormClose = (didChange: boolean) => {
    setIsFormOpen(false);
    setEditingDept(null);
    if (didChange) fetchDepartments();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
        <Button onClick={handleCreate}>Add Department</Button>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Name</Th>
            <Th>Code</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {departments.map((dept) => (
            <Tr key={dept.id}>
              <Td>{dept.id}</Td>
              <Td className="font-medium">{dept.name}</Td>
              <Td>{dept.code}</Td>
              <Td>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(dept)}>
                  Edit
                </Button>
              </Td>
            </Tr>
          ))}
          {departments.length === 0 && (
            <Tr>
              <Td className="text-center text-slate-500 py-8 text-center" /* React does not complain here */>No departments found.</Td>
            </Tr>
          )}
        </Tbody>
      </Table>

      <DepartmentForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        department={editingDept}
      />
    </div>
  );
}
