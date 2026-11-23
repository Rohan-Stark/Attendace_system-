import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import {
  getHodParentNotifications,
  retryHodParentNotification,
} from '../../services/hod.service';
import {
  getAdminParentNotifications,
  retryAdminParentNotification,
} from '../../services/admin.service';
import type {
  ParentNotificationItem,
  EmailConfigurationStatus,
  ParentNotificationState,
} from '../../types/api';

interface ParentNotificationsPageProps {
  mode?: 'hod' | 'admin';
}

function StateBadge({ state }: { state: ParentNotificationState }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    sending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    sent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    simulated: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    skipped: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
        styles[state] || styles.skipped
      }`}
    >
      {state}
    </span>
  );
}

export function ParentNotificationsPage({ mode = 'hod' }: ParentNotificationsPageProps) {
  const [items, setItems] = useState<ParentNotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [emailConfig, setEmailConfig] = useState<EmailConfigurationStatus | null>(null);

  const [stateFilter, setStateFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [usnFilter, setUsnFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        state: stateFilter || undefined,
        event_type: eventFilter || undefined,
        attendance_status: statusFilter || undefined,
        usn: usnFilter || undefined,
        page,
        page_size: pageSize,
      };
      const res =
        mode === 'admin'
          ? await getAdminParentNotifications(params)
          : await getHodParentNotifications(params);
      setItems(res.items);
      setTotal(res.total);
      setEmailConfig(res.email_config);
    } catch (err: any) {
      setError(err.detail || 'Failed to load parent email notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [mode, stateFilter, eventFilter, statusFilter, usnFilter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRetry = async (notificationId: number) => {
    setRetryingId(notificationId);
    setError('');
    try {
      if (mode === 'admin') {
        await retryAdminParentNotification(notificationId);
      } else {
        await retryHodParentNotification(notificationId);
      }
      await fetchNotifications();
    } catch (err: any) {
      setError(err.detail || 'Failed to retry notification.');
    } finally {
      setRetryingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Parent Email Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {mode === 'admin'
              ? 'All parent/guardian attendance email notifications across departments.'
              : 'Department parent/guardian attendance email log and delivery status.'}
          </p>
        </div>
        <Button variant="secondary" onClick={fetchNotifications} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {emailConfig && (
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-slate-700 dark:text-slate-300">Feature Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                emailConfig.enabled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {emailConfig.enabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Provider: <strong className="uppercase">{emailConfig.provider}</strong>
              {emailConfig.simulated ? ' (Simulated / Console Mode)' : ''}
            </span>
          </div>
          {emailConfig.configuration_problem && (
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              {emailConfig.configuration_problem}
            </span>
          )}
        </div>
      )}

      <ErrorMessage message={error} />

      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-end">
        <Input
          label="Student USN"
          value={usnFilter}
          onChange={(e) => {
            setUsnFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Search USN..."
          className="w-full sm:w-44"
        />

        <div className="flex flex-col space-y-1.5 w-full sm:w-40">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Delivery State</label>
          <select
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All States</option>
            <option value="pending">PENDING</option>
            <option value="sending">SENDING</option>
            <option value="sent">SENT</option>
            <option value="simulated">SIMULATED</option>
            <option value="failed">FAILED</option>
            <option value="skipped">SKIPPED</option>
          </select>
        </div>

        <div className="flex flex-col space-y-1.5 w-full sm:w-40">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Event Type</label>
          <select
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Events</option>
            <option value="initial">Initial</option>
            <option value="correction">Correction</option>
          </select>
        </div>

        <div className="flex flex-col space-y-1.5 w-full sm:w-40">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Attendance</label>
          <select
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            setStateFilter('');
            setEventFilter('');
            setStatusFilter('');
            setUsnFilter('');
            setPage(1);
          }}
        >
          Clear Filters
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Table>
            <Thead>
              <Tr>
                <Th>Student</Th>
                <Th>Guardian</Th>
                <Th>Session / Subject</Th>
                <Th>Attendance</Th>
                <Th>Event</Th>
                <Th>State</Th>
                <Th>Attempts</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    {item.student_name && (
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.student_name}
                      </div>
                    )}
                    <div className="font-mono text-xs text-slate-500">{item.student_usn || '-'}</div>
                  </Td>
                  <Td>
                    <div className="text-sm">{item.recipient_name || 'Guardian'}</div>
                    <div className="font-mono text-xs text-slate-500">
                      {mode === 'admin' ? item.recipient_email_masked : item.recipient_email}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-sm font-medium">
                      {item.subject_code ? `${item.subject_code} — ` : ''}
                      {item.subject_name || `Session #${item.session_id}`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.session_date || '-'} &bull; Sem {item.semester} / Sec {item.section}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        item.attendance_status === 'present'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}
                    >
                      {item.attendance_status}
                    </span>
                  </Td>
                  <Td className="capitalize text-sm">{item.event_type}</Td>
                  <Td>
                    <StateBadge state={item.state} />
                    {item.last_error && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs truncate" title={item.last_error}>
                        {item.last_error}
                      </div>
                    )}
                  </Td>
                  <Td className="text-sm">{item.attempt_count}</Td>
                  <Td>
                    {item.can_retry ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={retryingId === item.id}
                        disabled={!emailConfig?.enabled || retryingId !== null}
                        onClick={() => handleRetry(item.id)}
                      >
                        Retry
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">&mdash;</span>
                    )}
                  </Td>
                </Tr>
              ))}
              {items.length === 0 && (
                <Tr>
                  <Td colSpan={8} className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No parent email notifications found.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-sm text-slate-600 dark:text-slate-400">
              <span>
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
