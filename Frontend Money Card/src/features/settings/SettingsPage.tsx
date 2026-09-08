// ─── Settings Page (M5 Correction) ─────────────────────────
// Role-specific settings:
// - SUPER_ADMIN: Platform/account security settings ONLY (Profile, Change Password, Logout).
// - ORG_ADMIN: Organization profile details, name edit, and account security.
// Plans & Subscriptions are managed strictly on the dedicated /subscriptions page.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks';
import type { OrganizationOverview } from '@/types';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardContent,
  Badge,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { ChangePasswordForm, UnauthorizedPage } from '@/features/auth';
import { notify, formatDate } from '@/utils';
import {
  Settings as SettingsIcon,
  Save,
  AlertCircle,
  KeyRound,
  UserCheck,
} from 'lucide-react';

export function SettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading && !user) {
    return <LoadingState message="Loading settings..." />;
  }

  if (user?.role === 'SUPER_ADMIN') {
    return <SuperAdminSettingsView user={user} />;
  }

  if (user?.role === 'ORG_ADMIN') {
    return <OrgAdminSettingsView />;
  }

  return <UnauthorizedPage />;
}

// ─── Super Admin Settings (Platform Account Only) ───────────
function SuperAdminSettingsView({
  user,
}: {
  user: { name: string; email: string; role: string } | null;
}) {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-7 w-7 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-900">Super Admin Account Settings</h1>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader
          title="Platform Administrator Profile"
        />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span>Full Name</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{user?.name || 'Platform Admin'}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm text-slate-600">Email Address</span>
            <span className="text-sm font-mono font-medium text-slate-800">{user?.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Assigned Platform Role</span>
            <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50/50">
              {user?.role || 'SUPER_ADMIN'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Account Security & Password</h2>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

// ─── Organization Admin Settings ───────────────
function OrgAdminSettingsView() {
  const [orgData, setOrgData] = useState<OrganizationOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings form
  const [orgNameInput, setOrgNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchOrganizationDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.organizations.getOrganization();
      if (!result.success) {
        setError(result.error.message || 'Failed to load organization details');
        return;
      }
      setOrgData(result.data);
      setOrgNameInput(result.data.name);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const result = await apiService.organizations.getOrganization();
        if (isCancelled) return;

        if (!result.success) {
          setError(result.error.message || 'Failed to load organization details');
          return;
        }
        setOrgData(result.data);
        setOrgNameInput(result.data.name);
      } catch {
        if (!isCancelled) {
          setError('Unable to connect to the server. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!orgNameInput.trim()) {
      setNameError('Organization name is required');
      return;
    }
    setNameError(null);

    setIsSaving(true);
    try {
      const result = await apiService.organizations.updateOrganization({
        name: orgNameInput.trim(),
      });

      if (!result.success) {
        setApiError(result.error.message || 'Failed to update settings');
        return;
      }

      notify.success('Organization settings updated successfully');
      fetchOrganizationDetails();
    } catch {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading organization settings..." />;
  }

  if (error) {
    return <ErrorState title="Settings Error" message={error} onRetry={fetchOrganizationDetails} />;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-7 w-7 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-900">Organization Settings</h1>
        </div>
      </div>

      {/* Organization Identity */}
      <Card>
        <CardHeader
          title="Organization Identity"
        />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm font-medium text-slate-600">Organization Name</span>
            <span className="text-sm font-bold text-slate-900">{orgData?.name}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm font-medium text-slate-600">Organization ID</span>
            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-emerald-700 border border-slate-200">
              ORG-#{orgData?.id?.slice(0, 8).toUpperCase()}
            </code>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm font-medium text-slate-600">Account Status</span>
            <Badge variant={orgData?.status === 'ACTIVE' ? 'success' : 'danger'}>
              {orgData?.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Created Date</span>
            <span className="text-xs text-slate-600">
              {orgData?.createdAt ? formatDate(orgData.createdAt) : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Edit Organization Form */}
      <Card>
        <CardHeader
          title="Edit Organization Settings"
        />
        <CardContent>
          <form onSubmit={handleSaveSettings} noValidate className="space-y-4 max-w-lg">
            {apiError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{apiError}</span>
              </div>
            )}

            <Input
              id="org-name-edit"
              label="Organization Name"
              placeholder="e.g. Acme Cafeterias"
              value={orgNameInput}
              maxLength={30}
              onChange={(e) => {
                setOrgNameInput(e.target.value.slice(0, 30));
                if (nameError) setNameError(null);
                if (apiError) setApiError(null);
              }}
              error={nameError ?? undefined}
              disabled={isSaving}
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              disabled={isSaving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Organization Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Security Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Account Security</h2>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
