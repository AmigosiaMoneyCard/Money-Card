import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import {
  Card,
  Button,
  Input,
  Select,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { formatDateTime } from '@/utils';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  userName?: string | null;
  action: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  createdAt: string;
  organization?: {
    id: string;
    name: string;
  } | null;
}

export function GlobalAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page,
        limit: 30,
      };
      if (search.trim()) params.search = search.trim();
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (actionFilter !== 'ALL') params.action = actionFilter;

      const res = await (apiService as any).organizations.getAuditLogs(params);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        setError(res.error?.message || 'Failed to load audit logs');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error loading audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, severityFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="h-3 w-3" />
            WARNING
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Info className="h-3 w-3" />
            INFO
          </span>
        );
    }
  };

  const formatActionName = (action: string) => {
    return action.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Global Security & Audit Log
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Centralized platform audit trail monitoring authentication events, card blocks, and plan overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Logs
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Audited Events</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Warnings & Security Flags</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {logs.filter((l) => l.severity === 'WARNING').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Critical System Overrides</p>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {logs.filter((l) => l.severity === 'CRITICAL').length}
          </p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by action, user name, or keyword..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <div className="w-full sm:w-44">
              <Select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Severities', value: 'ALL' },
                  { label: 'Critical Only', value: 'CRITICAL' },
                  { label: 'Warnings Only', value: 'WARNING' },
                  { label: 'Info Only', value: 'INFO' },
                ]}
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Actions', value: 'ALL' },
                  { label: 'Login Failures', value: 'AUTH_LOGIN_FAILED' },
                  { label: 'Successful Logins', value: 'AUTH_LOGIN_SUCCESS' },
                  { label: 'Card Blocked', value: 'CARD_BLOCKED' },
                  { label: 'Card Unblocked', value: 'CARD_UNBLOCKED' },
                  { label: 'Plan Overrides', value: 'PLAN_OVERRIDE_UPDATED' },
                  { label: 'Data Exports', value: 'ORGANIZATION_DATA_EXPORTED' },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingState message="Retrieving security audit log entries..." />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState
              title="Audit Logs Unavailable"
              message={error}
              onRetry={fetchLogs}
            />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No Audit Records Found"
              description="No security or audit events matched your search and filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Severity</th>
                  <th className="px-4 py-3.5">Action Event</th>
                  <th className="px-4 py-3.5">Organization</th>
                  <th className="px-4 py-3.5">User / Actor</th>
                  <th className="px-4 py-3.5">IP Address</th>
                  <th className="px-4 py-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-xs">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getSeverityBadge(log.severity)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                      {formatActionName(log.action)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {log.organization?.name || 'Platform System'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {log.userName || 'Anonymous / Unauthenticated'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">
                      {log.ipAddress || 'Internal'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate font-mono">
                      {log.details ? JSON.stringify(log.details) : 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-600">
              Page {page} of {totalPages} ({totalCount} total entries)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
