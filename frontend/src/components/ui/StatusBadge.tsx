import { Badge } from './Badge';

export function StatusBadge({ status, activeLabel = 'Active', inactiveLabel = 'Inactive' }: { status: boolean | string, activeLabel?: string, inactiveLabel?: string }) {
  if (typeof status === 'boolean') {
    return status ? 
      <Badge variant="success">{activeLabel}</Badge> : 
      <Badge variant="danger">{inactiveLabel}</Badge>;
  }
  
  // Handle string statuses
  const s = status.toLowerCase();
  if (s === 'active') return <Badge variant="success">Active</Badge>;
  if (s === 'removed') return <Badge variant="danger">Removed</Badge>;
  return <Badge>{status}</Badge>;
}
