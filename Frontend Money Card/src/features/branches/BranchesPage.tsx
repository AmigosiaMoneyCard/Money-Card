// ─── Branches Management Page (M5) ─────────────────────────
// Complete Branch Management for ORG_ADMIN & SUPER_ADMIN.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { useBranch, usePermissions } from '@/hooks';
import type { Branch, ApiResult, OrganizationOverview } from '@/types';
import {
  Button,
  Input,
  Card,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { BulkCsvImportModal } from '@/components/common';
import { DataTable } from '@/components/tables';
import { notify, formatDate } from '@/utils';
import {
  Building2,
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  Trash2,
  X,
  MessageSquare,
  Copy,
  Check,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

// ─── Slide Switch Component (Far Right End) ─────────────────
interface SlideSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

export function SlideSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
}: SlideSwitchProps) {
  const isSm = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed ${
        isSm ? 'h-5 w-9' : 'h-6 w-11'
      } ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}
      title={label || (checked ? 'Active (click to deactivate)' : 'Inactive (click to activate)')}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${
          isSm
            ? `h-3.5 w-3.5 mt-[3px] ${checked ? 'translate-x-[19px]' : 'translate-x-[3px]'}`
            : `h-4.5 w-4.5 mt-[3px] ${checked ? 'translate-x-6' : 'translate-x-1'}`
        }`}
      />
    </button>
  );
}

// ─── Strict Validation Helpers ──────────────────────────────
export const validateCounterName = (name: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Counter name is required';
  }
  if (trimmed.length < 2 || trimmed.length > 20) {
    return 'Counter name must be between 2 and 20 characters';
  }
  if (!/^[a-zA-Z0-9\s\-&]+$/.test(trimmed)) {
    return 'Counter name can only contain letters, numbers, spaces, hyphens, and &';
  }
  return null;
};

export const validateMobileNumber = (phone: string): string | null => {
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    clean = clean.slice(2);
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  }

  if (!clean) {
    return 'Mobile number is required';
  }
  if (clean.length !== 10) {
    return 'Mobile number must be exactly 10 digits';
  }
  if (!/^[6-9]/.test(clean)) {
    return 'Mobile number must start with 6, 7, 8, or 9';
  }
  return null;
};

export const validatePassword = (password: string, isRequired = false): string | null => {
  if (!password) {
    if (isRequired) {
      return 'Password is required';
    }
    return null;
  }
  if (password.length < 6 || password.length > 30) {
    return 'Password must be between 6 and 30 characters';
  }
  return null;
};

export function BranchesPage() {
  const { currentBranch, selectBranch, setBranches: updateBranchContext } = useBranch();
  const { hasPermission } = usePermissions();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Organization Overview (for Plan Usage display)
  const [orgOverview, setOrgOverview] = useState<OrganizationOverview | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewEditModal, setShowViewEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteApiConflict, setDeleteApiConflict] = useState<boolean>(false);

  // Status toggle loading state
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Create modal inputs
  const [branchNameInput, setBranchNameInput] = useState('');
  const [branchPhoneInput, setBranchPhoneInput] = useState('');
  const [branchPasswordInput, setBranchPasswordInput] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);

  // View/Edit modal inputs
  const [editNameInput, setEditNameInput] = useState('');
  const [editPhoneInput, setEditPhoneInput] = useState('');
  const [editPasswordInput, setEditPasswordInput] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [currentBranchPassword, setCurrentBranchPassword] = useState('123456');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [editPhoneError, setEditPhoneError] = useState<string | null>(null);
  const [editPasswordError, setEditPasswordError] = useState<string | null>(null);
  const [viewEditApiError, setViewEditApiError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // WhatsApp Credentials Modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [createdBranchCredentials, setCreatedBranchCredentials] = useState<{
    name: string;
    phone: string;
    password?: string;
    branchId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Bulk CSV Import state
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Bulk WhatsApp Dispatch state
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [bulkCreatedCounters, setBulkCreatedCounters] = useState<
    { name: string; phone: string; password: string; branchId?: string }[]
  >([]);
  const [bulkCopied, setBulkCopied] = useState(false);

  const canManage = hasPermission('BRANCH_MANAGE');

  // ── Fetch Branches & Organization Usage ───────────────────
  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [branchRes, orgRes] = await Promise.all([
        apiService.branches.getBranches(),
        apiService.organizations.getOrganization(),
      ]);

      if (!branchRes.success) {
        setError(branchRes.error.message || 'Failed to load counters');
        return;
      }

      setBranches(branchRes.data.items);
      updateBranchContext(branchRes.data.items);

      if (orgRes.success) {
        setOrgOverview(orgRes.data);
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [updateBranchContext]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [branchRes, orgRes] = await Promise.all([
          apiService.branches.getBranches(),
          apiService.organizations.getOrganization(),
        ]);
        if (isCancelled) return;

        if (!branchRes.success) {
          setError(branchRes.error.message || 'Failed to load counters');
          return;
        }

        setBranches(branchRes.data.items);
        updateBranchContext(branchRes.data.items);

        if (orgRes.success) {
          setOrgOverview(orgRes.data);
        }
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
  }, [updateBranchContext]);

  // ── Instant Client-Side Filtered Branches ──────────────────
  const filteredBranches = useMemo(() => {
    let result = branches;
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();
    return result.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.manager?.phone && b.manager.phone.toLowerCase().includes(q)) ||
        (b.credentials?.phone && b.credentials.phone.toLowerCase().includes(q)),
    );
  }, [branches, searchQuery]);

  // ── Create Counter ─────────────────────────────────────────
  const handleOpenCreate = () => {
    setBranchNameInput('');
    setBranchPhoneInput('');
    setBranchPasswordInput('');
    setShowCreatePassword(false);
    setNameError(null);
    setPhoneError(null);
    setPasswordError(null);
    setModalApiError(null);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateCounterName(branchNameInput);
    const phoneErr = validateMobileNumber(branchPhoneInput);
    const passErr = validatePassword(branchPasswordInput, true);

    setNameError(nameErr);
    setPhoneError(phoneErr);
    setPasswordError(passErr);

    if (nameErr || phoneErr || passErr) return;

    setModalApiError(null);
    setIsSubmitting(true);
    try {
      const cleanPhone = branchPhoneInput.trim().replace(/\D/g, '').slice(-10);
      const result: ApiResult<Branch> = await apiService.branches.createBranch({
        name: branchNameInput.trim(),
        phone: cleanPhone,
        password: branchPasswordInput,
      });

      if (!result.success) {
        if (result.error.code === 'PLAN_LIMIT_REACHED') {
          setModalApiError(
            result.error.message ||
              'Counter limit reached for your active plan. Please upgrade your subscription to create more counters.',
          );
        } else {
          setModalApiError(result.error.message || 'Failed to create counter');
        }
        return;
      }

      notify.success('Counter created successfully');
      setShowCreateModal(false);
      fetchBranches();

      // Open WhatsApp Dispatch Modal
      setCreatedBranchCredentials({
        name: result.data.name,
        phone: result.data.credentials?.phone || cleanPhone,
        password: result.data.credentials?.password || branchPasswordInput,
        branchId: result.data.id,
      });
      setCopied(false);
      setShowWhatsAppModal(true);
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdBranchCredentials) return;
    const loginUrl = `${window.location.origin}/login`;
    const textToCopy =
      `Counter Name: ${createdBranchCredentials.name}\n` +
      `Phone Number: ${createdBranchCredentials.phone}\n` +
      `Password: ${createdBranchCredentials.password}\n` +
      `Login URL: ${loginUrl}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    notify.success('Credentials copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    if (!createdBranchCredentials) return;
    const loginUrl = `${window.location.origin}/login`;
    const message =
      `🍽️ *Welcome to Money Card Counter Portal*\n\n` +
      `Your counter account has been created successfully:\n\n` +
      `• *Counter Name:* ${createdBranchCredentials.name}\n` +
      `• *Mobile Number:* ${createdBranchCredentials.phone}\n` +
      `• *Password:* ${createdBranchCredentials.password}\n\n` +
      `🌐 *Counter Dashboard Link:* ${loginUrl}\n\n` +
      `_Log in using your Mobile Number and Password to access your Counter Menu, Staff, and Analytics._`;

    const cleanPhone = createdBranchCredentials.phone.replace(/\D/g, '').slice(-10);
    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // ── Consolidated View / Edit Counter Details ──────────────
  const handleOpenViewEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setEditNameInput(branch.name);
    const initialPhone = (branch.manager?.phone || branch.credentials?.phone || '').replace(/\D/g, '').slice(-10);
    setEditPhoneInput(initialPhone);
    const initialPassword = branch.credentials?.password || '123456';
    setCurrentBranchPassword(initialPassword);
    setShowCurrentPassword(false);
    setEditPasswordInput('');
    setShowEditPassword(false);
    setEditNameError(null);
    setEditPhoneError(null);
    setEditPasswordError(null);
    setViewEditApiError(null);
    setShowViewEditModal(true);
  };

  const handleViewEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    const nameErr = validateCounterName(editNameInput);
    const phoneErr = validateMobileNumber(editPhoneInput);
    const passErr = validatePassword(editPasswordInput, false);

    setEditNameError(nameErr);
    setEditPhoneError(phoneErr);
    setEditPasswordError(passErr);

    if (nameErr || phoneErr || passErr) {
      return;
    }

    setIsSubmitting(true);
    setViewEditApiError(null);

    try {
      const updatePayload: { name: string; phone?: string; password?: string } = {
        name: editNameInput.trim(),
      };
      if (editPhoneInput.trim()) {
        updatePayload.phone = editPhoneInput.trim().replace(/\D/g, '').slice(-10);
      }
      if (editPasswordInput.trim()) {
        updatePayload.password = editPasswordInput.trim();
      }

      const result = await apiService.branches.updateBranch(selectedBranch.id, updatePayload);

      if (!result.success) {
        setViewEditApiError(result.error.message || 'Failed to update counter details');
        return;
      }

      if (editPasswordInput.trim()) {
        setCurrentBranchPassword(editPasswordInput.trim());
      }
      notify.success('Counter details updated successfully');
      setShowViewEditModal(false);
      fetchBranches();
    } catch {
      notify.error('Bulk import failed');
      return { success: false, message: 'Bulk import failed' };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentialsFromEdit = () => {
    if (!selectedBranch) return;
    const cleanPhone = editPhoneInput.replace(/\D/g, '').slice(-10);
    const loginUrl = `${window.location.origin}/login`;
    const passwordText = editPasswordInput.trim() || currentBranchPassword || '123456';
    const textToCopy =
      `Counter Name: ${editNameInput.trim() || selectedBranch.name}\n` +
      `Mobile Number: ${cleanPhone || 'Not set'}\n` +
      `Password: ${passwordText}\n` +
      `Login URL: ${loginUrl}`;
    navigator.clipboard.writeText(textToCopy);
    notify.success('Counter credentials copied to clipboard');
  };

  const handleSendWhatsAppFromEdit = () => {
    if (!selectedBranch) return;
    const cleanPhone = editPhoneInput.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      notify.error('Please enter a valid 10-digit mobile number to send via WhatsApp');
      return;
    }

    const loginUrl = `${window.location.origin}/login`;
    const passwordText = editPasswordInput.trim() || currentBranchPassword || '123456';
    const message =
      `🍽️ *Money Card Counter Credentials*\n\n` +
      `Here are your counter login details:\n\n` +
      `• *Counter Name:* ${editNameInput.trim() || selectedBranch.name}\n` +
      `• *Mobile Number:* ${cleanPhone}\n` +
      `• *Password:* ${passwordText}\n\n` +
      `🌐 *Counter Dashboard Link:* ${loginUrl}\n\n` +
      `_Log in using your Mobile Number and Password to access your Counter Menu, Staff, and Analytics._`;

    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteFromViewEdit = () => {
    if (!selectedBranch) return;
    setShowViewEditModal(false);
    handleOpenDelete(selectedBranch);
  };

  // ── Direct Status Toggle via Slide Switch ─────────────────
    const activeBranchesCount = branches.filter((b) => b.status === 'ACTIVE').length;

  const handleDirectStatusToggle = async (branch: Branch) => {
    const newStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (branch.status === 'ACTIVE' && activeBranchesCount <= 1) {
      notify.error('Cannot disable this counter. A cafeteria must have at least one active counter.');
      return;
    }

    setIsTogglingStatus(branch.id);
    try {
      const result = await apiService.branches.updateBranch(branch.id, {
        status: newStatus,
      });

      if (!result.success) {
        notify.error(result.error.message || 'Failed to update counter status');
        return;
      }

      notify.success(
        `Counter ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      );

      // If current selected branch was deactivated, recover gracefully
      if (currentBranch?.id === branch.id && newStatus === 'INACTIVE') {
        const remainingActive = branches.find(
          (b) => b.id !== branch.id && b.status === 'ACTIVE',
        );
        if (remainingActive) {
          selectBranch(remainingActive);
        }
      }

      fetchBranches();
    } catch {
      notify.error('An unexpected error occurred while updating counter status');
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const BRANCH_CSV_TEMPLATE = 'counterName,phone,password,address\n';

  const handleBulkImport = async (rows: any[]): Promise<{ success: boolean; message?: string; data?: any }> => {
    setIsSubmitting(true);
    try {
      const result = await apiService.branches.createBranchesBatch({ branches: rows });
      if (result.success) {
        notify.success(`Created ${result.data.createdCount || 0} counters${result.data.errors?.length ? ` (with ${result.data.errors.length} errors)` : ''}`);
        fetchBranches();
        if (result.data.created?.length > 0) {
          setBulkCreatedCounters(result.data.created.map((c: any) => ({ ...c, branchId: c.id })));
          setShowBulkWhatsAppModal(true);
        }
        return { success: true, data: result.data };
      } else {
        notify.error(result.error.message || 'Bulk import failed');
        return { success: false, message: result.error.message || 'Bulk import failed' };
      }
    } catch {
      notify.error('Bulk import failed');
      return { success: false, message: 'Bulk import failed' };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyAllCredentials = () => {
    if (!bulkCreatedCounters.length) return;
    const loginUrl = `${window.location.origin}/login`;
    const textToCopy = bulkCreatedCounters
      .map(
        (c) =>
          `Counter Name: ${c.name}\nPhone Number: ${c.phone}\nPassword: ${c.password}\nLogin URL: ${loginUrl}`,
      )
      .join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setBulkCopied(true);
    notify.success('All credentials copied to clipboard');
    setTimeout(() => setBulkCopied(false), 2500);
  };

  const handleDownloadAllCredentials = () => {
    if (!bulkCreatedCounters.length) return;
    const loginUrl = `${window.location.origin}/login`;
    const csvContent =
      'Counter Name,Phone Number,Password,Login URL\n' +
      bulkCreatedCounters
        .map((c) => `${c.name},${c.phone},${c.password},${loginUrl}`)
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_counter_credentials.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.success('Credentials CSV downloaded');
  };

  // ── Delete / Archive Branch ────────────────────────────────
  const handleOpenDelete = (branch: Branch) => {
    setSelectedBranch(branch);
    setModalApiError(null);
    setDeleteApiConflict(false);
    setShowDeleteModal(true);
  };

  const handleDeleteSubmit = async (forceArchive = false) => {
    if (!selectedBranch) return;
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const result = await apiService.branches.deleteBranch(selectedBranch.id, {
        archive: forceArchive,
        force: forceArchive,
      });

      if (!result.success) {
        if ((result.error as any)?.code === 'DEPENDENT_RECORDS_EXIST' || (result.error as any)?.status === 409) {
          setDeleteApiConflict(true);
        }
        setModalApiError(result.error.message || 'Failed to delete counter');
        return;
      }

      notify.success(
        result.data?.archived
          ? 'Counter deactivated to preserve historical accounting records'
          : 'Counter deleted successfully',
      );
      setShowDeleteModal(false);
      fetchBranches();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Data Table Columns ────────────────────────────────────
  const columns = [
    {
      key: 'name',
      header: 'Counter Name',
      className: 'w-full',
      render: (branch: Branch) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Building2 className="h-4 w-4" />
          </div>
          <p className="font-bold text-slate-900 leading-tight">
            {branch.name}
          </p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      className: 'text-right whitespace-nowrap w-36',
      render: (branch: Branch) => (
        <div className="text-right text-xs text-slate-500">{formatDate(branch.createdAt)}</div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right whitespace-nowrap w-44',
      render: (branch: Branch) => (
        <div className="flex items-center justify-end">
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenViewEdit(branch)}
              leftIcon={<Eye className="h-3.5 w-3.5 text-emerald-600" />}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-white border-slate-200 hover:border-emerald-500 hover:text-emerald-700 font-medium text-slate-700 shadow-2xs cursor-pointer"
            >
              View/Edit Details
            </Button>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'text-right whitespace-nowrap w-36',
      render: (branch: Branch) => (
        <div className="flex items-center justify-end gap-2.5">
          {canManage && (
            <SlideSwitch
              checked={branch.status === 'ACTIVE'}
              disabled={isTogglingStatus === branch.id}
              onChange={() => handleDirectStatusToggle(branch)}
              label={branch.status === 'ACTIVE' ? 'Active counter (click to deactivate)' : 'Inactive counter (click to activate)'}
            />
          )}
          <Badge variant={branch.status === 'ACTIVE' ? 'success' : 'outline'} className="min-w-[65px] justify-center text-xs">
            {branch.status}
          </Badge>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Counters</h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canManage && (
            <div className="flex items-center gap-1">
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create Counter
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowBulkModal(true)}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                className="rounded-l-none"
              >
                Bulk Upload
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Plan Usage Indicator (if available) */}
      {orgOverview?.usage && (
        <div className="text-xs text-slate-600 font-medium">
          Counter Usage:{' '}
          <strong className="text-slate-900">{orgOverview.usage.branchCount}</strong> /{' '}
          {orgOverview.usage.branchLimit} counters created
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search counters by name..."
            value={searchQuery}
            maxLength={30}
            onChange={(e) => setSearchQuery(e.target.value.slice(0, 30))}
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button variant="outline" size="md" onClick={fetchBranches} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading counters..." />
      ) : error ? (
        <ErrorState
          title="Failed to load counters"
          message={error}
          onRetry={fetchBranches}
        />
      ) : branches.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-slate-500" />}
          title="No counters found"
          description="Get started by adding your first operational counter."
          action={
            canManage ? (
              <Button variant="primary" onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Create First Branch
              </Button>
            ) : undefined
          }
        />
      ) : filteredBranches.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-slate-500" />}
          title="No matching counters"
          description={
            searchQuery
              ? `No counters match the name "${searchQuery}".`
              : `No counters match the selected counter filter.`
          }
          action={
            searchQuery ? (
              <Button variant="outline" onClick={() => setSearchQuery('')} leftIcon={<X className="h-4 w-4" />}>
                Clear Search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card padding="none">
              <DataTable<Branch>
                data={filteredBranches}
                columns={columns}
                keyExtractor={(item) => item.id}
              />
            </Card>
          </div>

          {/* Mobile Card List View (Optimized for Mobile/Touch Screens) */}
          <div className="md:hidden space-y-3">
            {filteredBranches.map((branch) => (
              <Card key={branch.id} padding="md" className="border border-slate-200 bg-white shadow-2xs space-y-3">
                {/* Header with Counter info on left, Slide Switch on right end */}
                <div className="w-full flex items-start justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {branch.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Created: {formatDate(branch.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Far Right End: Slide Switch + Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && (
                      <SlideSwitch
                        checked={branch.status === 'ACTIVE'}
                        disabled={isTogglingStatus === branch.id}
                        onChange={() => handleDirectStatusToggle(branch)}
                        size="sm"
                        label={branch.status === 'ACTIVE' ? 'Active counter' : 'Inactive counter'}
                      />
                    )}
                    <Badge variant={branch.status === 'ACTIVE' ? 'success' : 'outline'} className="text-xs min-w-[55px] justify-center">
                      {branch.status}
                    </Badge>
                  </div>
                </div>

                {/* Bottom Action: View/Edit Details */}
                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenViewEdit(branch)}
                      leftIcon={<Eye className="h-3.5 w-3.5 text-emerald-600" />}
                      className="text-xs py-1.5 px-3 bg-white border-slate-200 hover:border-emerald-500 hover:text-emerald-700 font-medium text-slate-700 shadow-2xs cursor-pointer"
                    >
                      View/Edit Details
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Create Counter Modal ───────────────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Counter"
      >
        <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span>{modalApiError}</span>
            </div>
          )}

          <Input
            id="create-branch-name"
            label="Counter Name"
            placeholder="e.g. South Indian Express, Juice Bar, Bakery..."
            maxLength={20}
            value={branchNameInput}
            onChange={(e) => {
              setBranchNameInput(e.target.value.slice(0, 20));
              if (nameError) setNameError(null);
            }}
            error={nameError || undefined}
            disabled={isSubmitting}
            autoFocus
          />

          <Input
            id="create-branch-phone"
            label="Mobile number"
            type="tel"
            maxLength={10}
            placeholder="e.g. 9876543210 (10-digit mobile)"
            value={branchPhoneInput}
            onChange={(e) => {
              const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
              setBranchPhoneInput(numericOnly);
              if (phoneError) setPhoneError(null);
            }}
            error={phoneError || undefined}
            disabled={isSubmitting}
          />

          <Input
            id="create-branch-password"
            label="Login Password"
            type={showCreatePassword ? 'text' : 'password'}
            placeholder="Minimum 6 characters"
            value={branchPasswordInput}
            onChange={(e) => {
              setBranchPasswordInput(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            rightElement={
              <button
                type="button"
                onClick={() => setShowCreatePassword(!showCreatePassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer p-1"
                tabIndex={-1}
                aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
              >
                {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={passwordError || undefined}
            disabled={isSubmitting}
          />

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Create Counter
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── WhatsApp Credentials Modal ────────────────────────────── */}
      <Modal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title="Counter Created Successfully!"
        description="Share the login credentials with the counter manager via WhatsApp or copy directly."
        size="md"
      >
        <div className="space-y-4 py-1">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">✓</span>
              <span>Counter Login Credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                <span className="text-slate-500 block text-[11px]">Counter Name</span>
                <span className="font-semibold text-slate-800 text-sm">{createdBranchCredentials?.name}</span>
              </div>
              <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                <span className="text-slate-500 block text-[11px]">Mobile Number (Login ID)</span>
                <span className="font-semibold text-slate-800 font-mono text-sm">{createdBranchCredentials?.phone}</span>
              </div>
              <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                <span className="text-slate-500 block text-[11px]">Password</span>
                <span className="font-semibold text-slate-800 font-mono text-sm">{createdBranchCredentials?.password}</span>
              </div>
              <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                <span className="text-slate-500 block text-[11px]">Web Portal</span>
                <span className="font-medium text-emerald-700 truncate block">{window.location.origin}/login</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyCredentials}
              className="flex-1 justify-center gap-2 cursor-pointer"
              leftIcon={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            >
              {copied ? 'Copied Details' : 'Copy Credentials'}
            </Button>
            <Button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent cursor-pointer"
              leftIcon={<MessageSquare className="h-4 w-4" />}
            >
              Send via WhatsApp
            </Button>
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setShowWhatsAppModal(false)}
            >
              Close
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Consolidated View / Edit Counter Details Modal ─────────── */}
      <Modal
        isOpen={showViewEditModal}
        onClose={() => !isSubmitting && setShowViewEditModal(false)}
        title="View / Edit Counter Details"
        size="lg"
      >
        <div className="space-y-5 py-1">
          {viewEditApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span>{viewEditApiError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleViewEditSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-branch-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Counter Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="edit-branch-name"
                  placeholder="e.g. South Indian Express"
                  maxLength={20}
                  value={editNameInput}
                  onChange={(e) => {
                    setEditNameInput(e.target.value.slice(0, 20));
                    if (editNameError) setEditNameError(null);
                  }}
                  error={editNameError || undefined}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="edit-branch-phone" className="block text-sm font-medium text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 select-none">
                    +91
                  </span>
                  <input
                    id="edit-branch-phone"
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={editPhoneInput}
                    onChange={(e) => {
                      const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditPhoneInput(numericOnly);
                      if (editPhoneError) setEditPhoneError(null);
                    }}
                    disabled={isSubmitting}
                    className={`w-full rounded-lg border bg-white pl-11 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-1 ${
                      editPhoneError
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                    }`}
                  />
                </div>
                {editPhoneError && (
                  <p className="mt-1 text-xs text-rose-600">{editPhoneError}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="edit-branch-password" className="block text-sm font-medium text-slate-700 mb-1">
                Reset Password
              </label>
              <Input
                id="edit-branch-password"
                type={showEditPassword ? 'text' : 'password'}
                placeholder="Enter new password (min 6 chars)"
                maxLength={30}
                value={editPasswordInput}
                onChange={(e) => {
                  setEditPasswordInput(e.target.value.slice(0, 30));
                  if (editPasswordError) setEditPasswordError(null);
                }}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer p-1"
                    tabIndex={-1}
                    aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={editPasswordError || undefined}
                disabled={isSubmitting}
              />
            </div>

            {/* Current Password Display Card */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Current Password
                </span>
                <span className="font-mono text-sm font-bold text-slate-800">
                  {showCurrentPassword ? (editPasswordInput.trim() || currentBranchPassword) : '••••••••'}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Copying or sharing credentials will use this password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{showCurrentPassword ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>

            {/* Quick Sharing Actions Bar */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <span className="text-xs font-semibold text-slate-700 block">Quick Credentials Sharing</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCredentialsFromEdit}
                  className="flex-1 justify-center gap-1.5 text-xs py-1.5 bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                  leftIcon={<Copy className="h-3.5 w-3.5 text-slate-500" />}
                >
                  Copy Credentials
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendWhatsAppFromEdit}
                  className="flex-1 justify-center gap-1.5 text-xs py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent cursor-pointer font-medium"
                  leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                >
                  Send via WhatsApp
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-200">
              {/* Far Left Side: Delete Counter */}
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleDeleteFromViewEdit}
                leftIcon={<Trash2 className="h-4 w-4" />}
                className="cursor-pointer"
              >
                Delete Counter
              </Button>

              {/* Far Right Side: Cancel & Save Changes */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowViewEditModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* ── Bulk CSV Import Modal ──────────────────────────────── */}
      <BulkCsvImportModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload Counters (CSV)"
        templateFilename="counters-template.csv"
        templateContent={BRANCH_CSV_TEMPLATE}
        onImport={handleBulkImport}
      />

      {/* ── Bulk WhatsApp Credentials Dispatch Modal ───────────── */}
      <Modal
        isOpen={showBulkWhatsAppModal}
        onClose={() => setShowBulkWhatsAppModal(false)}
        title={`Counters Created Successfully! (${bulkCreatedCounters.length})`}
        description={`Share the login credentials with each counter manager:`}
        size="2xl"
      >
        <div className="space-y-4">
          {bulkCreatedCounters.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 font-semibold text-sm">{bulkCreatedCounters.length} Counter Credentials</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAllCredentials}
                    leftIcon={bulkCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    className="text-xs cursor-pointer"
                  >
                    {bulkCopied ? 'Copied' : 'Copy All Credentials'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAllCredentials}
                    leftIcon={<Download className="h-3.5 w-3.5" />}
                    className="text-xs cursor-pointer"
                  >
                    Download CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/60 text-slate-500">
                    <tr>
                      <th className="text-left py-2 px-2.5 font-medium border-b border-emerald-100">Counter Name</th>
                      <th className="text-left py-2 px-2.5 font-medium border-b border-emerald-100">Mobile Number</th>
                      <th className="text-left py-2 px-2.5 font-medium border-b border-emerald-100">Password</th>
                      <th className="text-right py-2 px-2.5 font-medium border-b border-emerald-100">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50">
                    {bulkCreatedCounters.map((c, i) => {
                      const cleanPhone = c.phone.replace(/\D/g, '').slice(-10);
                      const loginUrl = `${window.location.origin}/login`;
                      const message = encodeURIComponent(
                        `Counter Name: ${c.name}\nPhone: ${c.phone}\nPassword: ${c.password}\nDashboard: ${loginUrl}`,
                      );
                      const waUrl = `https://wa.me/91${cleanPhone}?text=${message}`;
                      return (
                        <tr key={`${c.name}-${i}`}>
                          <td className="px-2.5 py-2 font-semibold text-slate-800">{c.name}</td>
                          <td className="px-2.5 py-2 font-mono text-slate-700">{c.phone}</td>
                          <td className="px-2.5 py-2 font-mono text-slate-700">{c.password}</td>
                          <td className="px-2.5 py-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(waUrl, '_blank', 'noopener,noreferrer')}
                              className="text-xs px-2.5 py-1 bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent cursor-pointer"
                              leftIcon={<MessageSquare className="h-3 w-3" />}
                            >
                              Send
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowBulkWhatsAppModal(false)}>Done</Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ────────────────────────────── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isSubmitting && setShowDeleteModal(false)}
        title="Delete Counter"
        size="md"
      >
        <div className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Cannot Delete Counter</p>
                <p>{modalApiError}</p>
              </div>
            </div>
          )}

          {!deleteApiConflict ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-sm text-slate-800 font-medium">
                Are you sure you want to delete <span className="text-emerald-700 font-bold font-mono">{selectedBranch?.name}</span>?
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2 text-xs text-amber-800">
              <p className="font-bold text-amber-700">Safe Deactivation Available</p>
              <p>
                This counter cannot be permanently erased because customers have financial transactions recorded here. You can safely <strong>Deactivate</strong> it so it is hidden from operations while preserving all historical records.
              </p>
            </div>
          )}

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {deleteApiConflict ? (
              <Button
                variant="primary"
                onClick={() => handleDeleteSubmit(true)}
                isLoading={isSubmitting}
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                Safe Deactivate
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => handleDeleteSubmit(false)}
                isLoading={isSubmitting}
              >
                Delete Branch
              </Button>
            )}
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
