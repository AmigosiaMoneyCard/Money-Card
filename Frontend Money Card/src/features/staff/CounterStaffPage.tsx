// ─── Counter Staff Management Page ───────────────────────────
// Isolated Staff Management experience exclusively for Counter Admins (STAFF role).
// Scoped strictly to the counter's assigned branch.
// Displays genuine staff members (Cashiers / Kitchen Staff) with zero phantom counter users.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions, useBranch, useAuth } from '@/hooks';
import type {
  Staff,
  Branch,
  StaffPerformanceMetric,
} from '@/types';
import {
  Button,
  Input,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatCurrency } from '@/utils';
import { filterStaffActivities, calculateScopedStaffMetrics } from '@/features/analytics/staffActivityFilter';
import { MANAGER_PERMISSIONS, KITCHEN_PERMISSIONS } from './constants';
import { UnauthorizedPage } from '@/features/auth';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  User,
  Key,
  X,
  FileSpreadsheet,
  Smartphone,
  Copy,
  Trash2,
} from 'lucide-react';

const getTodayDateStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function CounterStaffPage() {
  const { hasPermission } = usePermissions();
  const { currentBranch } = useBranch();
  const { user } = useAuth();

  const canView = hasPermission('STAFF_VIEW');
  const canManage = hasPermission('STAFF_MANAGE') || user?.role === 'STAFF';

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MANAGER' | 'KITCHEN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStaffDetailsModal, setShowStaffDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingStaffId, setTogglingStaffId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [formRoleType, setFormRoleType] = useState<'MANAGER' | 'KITCHEN'>('MANAGER');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WhatsApp Credentials Modal
  const [showStaffCreatedModal, setShowStaffCreatedModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    phone: string;
    password: string;
    counterName: string;
  } | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Password Update States
  const [formNewPassword, setFormNewPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);
  const [showChangePasswordSection, setShowChangePasswordSection] = useState(false);

  // Audit / Summary States
  const [selectedStaffForAudit, setSelectedStaffForAudit] = useState<Staff | null>(null);
  const [staffPerformanceList, setStaffPerformanceList] = useState<StaffPerformanceMetric[]>([]);
  const [auditStartDate, setAuditStartDate] = useState<string>(getTodayDateStr);
  const [auditEndDate, setAuditEndDate] = useState<string>(getTodayDateStr);
  const [auditActivityTypeFilter, setAuditActivityTypeFilter] = useState<'ALL' | 'CARD_ACTIVATION' | 'RECHARGE' | 'PURCHASE' | 'CARD_SETTLEMENT' | 'REFUND' | 'OTHER'>('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  const activeBranchId = currentBranch?.id || user?.assignedBranchIds?.[0] || '';
  const activeBranch = branches.find((b) => b.id === activeBranchId) || currentBranch;
  const activeBranchName = activeBranch?.name || currentBranch?.name || 'Counter';

  // ── Fetch Staff & Branches ─────────────────────────────────
  const fetchStaffData = useCallback(async () => {
    setError(null);
    try {
      const [staffRes, branchRes, analyticsRes] = await Promise.all([
        apiService.staff.getStaff({ search: searchQuery }),
        apiService.branches.getBranches(),
        apiService.analytics.getOverview(),
      ]);

      if (!staffRes.success) {
        setError(staffRes.error.message || 'Failed to load staff list');
        return;
      }

      setStaffList(staffRes.data.items);
      if (branchRes.success) setBranches(branchRes.data.items);
      if (analyticsRes.success && analyticsRes.data.staffPerformance) {
        setStaffPerformanceList(analyticsRes.data.staffPerformance);
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [staffRes, branchRes, analyticsRes] = await Promise.all([
          apiService.staff.getStaff({ search: searchQuery }),
          apiService.branches.getBranches(),
          apiService.analytics.getOverview(),
        ]);
        if (isCancelled) return;

        if (!staffRes.success) {
          setError(staffRes.error.message || 'Failed to load staff list');
          return;
        }

        setStaffList(staffRes.data.items);
        if (branchRes.success) setBranches(branchRes.data.items);
        if (analyticsRes.success && analyticsRes.data.staffPerformance) {
          setStaffPerformanceList(analyticsRes.data.staffPerformance);
        }
      } catch {
        if (!isCancelled) setError('Unable to connect to the server. Please try again.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  // ── Client-side Filtered Staff ──────────────────────────────
  const filteredStaff = useMemo(() => {
    let result = staffList;

    // Filter by active branch if applicable
    if (activeBranchId && activeBranchId !== 'ALL') {
      result = result.filter(
        (s) =>
          !Array.isArray(s.assignedBranchIds) ||
          s.assignedBranchIds.length === 0 ||
          s.assignedBranchIds.includes(activeBranchId),
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (roleFilter !== 'ALL') {
      result = result.filter((s) => {
        const isKitchen =
          s.staffType === 'KITCHEN' ||
          (!s.permissions.includes('RECHARGE') &&
            (s.permissions.includes('PRODUCT_VIEW') || s.permissions.includes('PRODUCT_MANAGE')));
        return roleFilter === 'KITCHEN' ? isKitchen : !isKitchen;
      });
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();
    return result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)),
    );
  }, [staffList, activeBranchId, statusFilter, roleFilter, searchQuery]);

  // ── Open Add Staff Modal ────────────────────────────────────
  const handleOpenAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setShowAddPassword(false);
    setFormRoleType('MANAGER');
    setFormErrors({});
    setModalApiError(null);
    setShowAddModal(true);
  };

  // ── Validate & Submit Add Staff ─────────────────────────────
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setModalApiError(null);

    const errors: Record<string, string> = {};
    const trimmedName = formName.trim();
    if (!trimmedName) {
      errors.name = 'Staff name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Staff name must be at least 2 characters';
    }

    const cleanPhone = formPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      errors.phone = 'Valid 10-digit mobile number is required';
    } else if (!/^[6-9]/.test(cleanPhone)) {
      errors.phone = 'Mobile number must start with 6, 7, 8, or 9';
    }

    const trimmedPassword = formPassword.trim();
    if (!trimmedPassword || trimmedPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const perms = formRoleType === 'KITCHEN' ? KITCHEN_PERMISSIONS : MANAGER_PERMISSIONS;
      const targetBranchIds = activeBranchId ? [activeBranchId] : [];

      const res = await apiService.staff.createStaff({
        name: trimmedName,
        phone: cleanPhone,
        password: trimmedPassword,
        assignedBranchIds: targetBranchIds,
        permissions: perms,
        staffType: formRoleType,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to create staff member');
        setIsSubmitting(false);
        return;
      }

      setShowAddModal(false);
      setCreatedCredentials({
        name: trimmedName,
        phone: cleanPhone,
        password: trimmedPassword,
        counterName: activeBranchName,
      });
      setShowStaffCreatedModal(true);
      fetchStaffData();
      notify.success(`Staff member ${trimmedName} created successfully`);
    } catch {
      setModalApiError('An unexpected error occurred while creating staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Staff Details Modal ────────────────────────────────
  const handleOpenStaffDetails = (staff: Staff) => {
    setSelectedStaff(staff);
    setFormName(staff.name);
    setFormPhone(staff.phone || '');
    setFormEmail(staff.email || '');
    const isKitchen =
      staff.staffType === 'KITCHEN' ||
      (!staff.permissions.includes('RECHARGE') &&
        (staff.permissions.includes('PRODUCT_VIEW') || staff.permissions.includes('PRODUCT_MANAGE')));
    setFormRoleType(isKitchen ? 'KITCHEN' : 'MANAGER');
    setFormErrors({});
    setModalApiError(null);
    setShowChangePasswordSection(false);
    setFormNewPassword('');
    setFormConfirmPassword('');
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);
    setShowStaffDetailsModal(true);
  };

  // ── Save Staff Edits ────────────────────────────────────────
  const handleSaveStaffChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !canManage) return;

    setFormErrors({});
    setModalApiError(null);

    const errors: Record<string, string> = {};
    const trimmedName = formName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      errors.name = 'Staff name must be at least 2 characters';
    }

    const cleanPhone = formPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      errors.phone = 'Valid 10-digit mobile number is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const perms = formRoleType === 'KITCHEN' ? KITCHEN_PERMISSIONS : MANAGER_PERMISSIONS;
      const res = await apiService.staff.updateStaff(selectedStaff.id, {
        name: trimmedName,
        phone: cleanPhone,
        email: formEmail.trim() || undefined,
        permissions: perms,
        staffType: formRoleType,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update staff member');
        setIsSubmitting(false);
        return;
      }

      setShowStaffDetailsModal(false);
      fetchStaffData();
      notify.success('Staff details updated successfully');
    } catch {
      setModalApiError('An unexpected error occurred while updating staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Change Staff Password ───────────────────────────────────
  const handleChangePassword = async () => {
    if (!selectedStaff) return;
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    if (!formNewPassword || formNewPassword.length < 8) {
      setPasswordChangeError('Password must be at least 8 characters');
      return;
    }
    if (formNewPassword !== formConfirmPassword) {
      setPasswordChangeError('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiService.staff.changePassword(selectedStaff.id, { newPassword: formNewPassword });
      if (!res.success) {
        setPasswordChangeError(res.error.message || 'Failed to update password');
        return;
      }
      setPasswordChangeSuccess('Password updated successfully');
      setFormNewPassword('');
      setFormConfirmPassword('');
      setTimeout(() => setShowChangePasswordSection(false), 1500);
      notify.success('Staff password updated successfully');
    } catch {
      setPasswordChangeError('An unexpected error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── Toggle Staff Status ─────────────────────────────────────
  const handleToggleStatus = async (staff: Staff) => {
    if (!canManage) return;
    const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setTogglingStaffId(staff.id);

    setStaffList((prev) =>
      prev.map((s) => (s.id === staff.id ? { ...s, status: newStatus } : s)),
    );

    try {
      const res = await apiService.staff.updateStaff(staff.id, { status: newStatus });
      if (!res.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, status: staff.status } : s)),
        );
        notify.error(res.error.message || 'Failed to change staff status');
        return;
      }
      notify.success(`Staff member is now ${newStatus === 'ACTIVE' ? 'Active' : 'Inactive'}`);
    } catch {
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, status: staff.status } : s)),
      );
      notify.error('Failed to change staff status');
    } finally {
      setTogglingStaffId(null);
    }
  };

  // ── Delete Staff Member ─────────────────────────────────────
  const handleOpenDelete = (staff: Staff) => {
    setStaffToDelete(staff);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    setIsDeleting(true);
    try {
      const res = await apiService.staff.deleteStaff(staffToDelete.id);
      if (!res.success) {
        notify.error(res.error.message || 'Failed to remove staff member');
        setIsDeleting(false);
        return;
      }

      setShowDeleteModal(false);
      setStaffToDelete(null);
      fetchStaffData();
      notify.success('Staff member removed successfully');
    } catch {
      notify.error('An unexpected error occurred while deleting staff');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Open Staff Summary / Audit ──────────────────────────────
  const handleOpenStaffAudit = (staff: Staff) => {
    setSelectedStaffForAudit(staff);
    const today = getTodayDateStr();
    setAuditStartDate(today);
    setAuditEndDate(today);
    setAuditActivityTypeFilter('ALL');
    setAuditSearch('');
  };

  const targetStaffMetric = useMemo(() => {
    if (!selectedStaffForAudit) return null;
    return (
      staffPerformanceList.find((p) => p.staffId === selectedStaffForAudit.id) || {
        staffId: selectedStaffForAudit.id,
        staffName: selectedStaffForAudit.name,
        role: selectedStaffForAudit.staffType === 'KITCHEN' ? 'Kitchen Staff' : 'Counter Manager',
        status: selectedStaffForAudit.status,
        branchId: activeBranchId,
        branchName: activeBranchName,
        cardsActivatedCount: 0,
        cardsSettledCount: 0,
        cardRechargeCount: 0,
        cardRechargeVolume: 0,
        purchaseCount: 0,
        purchaseVolume: 0,
        refundCount: 0,
        refundVolume: 0,
        totalTransactionsCount: 0,
        totalVolumeHandled: 0,
        activities: [],
      }
    );
  }, [selectedStaffForAudit, staffPerformanceList, activeBranchId, activeBranchName]);

  const scopedAuditActivities = useMemo(() => {
    if (!targetStaffMetric?.activities) return [];
    return filterStaffActivities({
      activities: targetStaffMetric.activities,
      branchFilter: 'ALL',
      startDate: auditStartDate,
      endDate: auditEndDate,
    });
  }, [targetStaffMetric, auditStartDate, auditEndDate]);

  const filteredAuditActivities = useMemo(() => {
    return filterStaffActivities({
      activities: scopedAuditActivities,
      branchFilter: 'ALL',
      typeFilter: auditActivityTypeFilter,
      searchQuery: auditSearch,
    });
  }, [scopedAuditActivities, auditActivityTypeFilter, auditSearch]);

  const auditMetrics = useMemo(() => {
    if (!targetStaffMetric) {
      return {
        cardsActivatedCount: 0,
        cardsSettledCount: 0,
        cardRechargeVolume: 0,
        purchaseVolume: 0,
        refundVolume: 0,
      };
    }
    if (scopedAuditActivities.length === 0 && targetStaffMetric.activities.length === 0) {
      return targetStaffMetric;
    }
    const activitiesToCalculate = filteredAuditActivities.length > 0 ? filteredAuditActivities : scopedAuditActivities;
    return calculateScopedStaffMetrics(activitiesToCalculate);
  }, [targetStaffMetric, scopedAuditActivities, filteredAuditActivities]);

  if (!canView) {
    return <UnauthorizedPage />;
  }

  // ── Table Columns for Counter Staff ─────────────────────────
  const columns = [
    {
      key: 'name',
      header: 'Staff Name',
      className: 'min-w-[180px]',
      render: (staff: Staff) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <User className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">{staff.name}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      className: 'w-40',
      render: (staff: Staff) => (
        <span className="text-xs font-medium text-slate-700 font-mono">
          {staff.phone ? `+91 ${staff.phone}` : '-'}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      className: 'w-36',
      render: (staff: Staff) => {
        const isKitchen =
          staff.staffType === 'KITCHEN' ||
          (!staff.permissions.includes('RECHARGE') &&
            (staff.permissions.includes('PRODUCT_VIEW') || staff.permissions.includes('PRODUCT_MANAGE')));
        return (
          <Badge
            variant="outline"
            className={
              !isKitchen
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-xs'
                : 'border-blue-300 bg-blue-50 text-blue-700 font-semibold text-xs'
            }
          >
            {isKitchen ? 'Kitchen Staff' : 'Counter Manager'}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-28 text-center',
      render: (staff: Staff) => (
        <button
          type="button"
          disabled={!canManage || togglingStaffId === staff.id}
          onClick={() => handleToggleStatus(staff)}
          className="cursor-pointer"
          title="Click to toggle status"
        >
          <Badge
            variant={staff.status === 'ACTIVE' ? 'success' : 'default'}
            className="text-xs font-semibold uppercase tracking-wider"
          >
            {togglingStaffId === staff.id ? 'Updating...' : staff.status}
          </Badge>
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right min-w-[240px]',
      render: (staff: Staff) => (
        <div className="flex items-center justify-end gap-1.5">
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenStaffDetails(staff)}
              className="text-xs h-7 px-2.5 rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all shadow-2xs cursor-pointer"
              leftIcon={<Edit2 className="h-3 w-3 text-emerald-600" />}
            >
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenStaffAudit(staff)}
            className="text-xs h-7 px-2.5 rounded-lg border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-2xs cursor-pointer"
            leftIcon={<FileSpreadsheet className="h-3 w-3 text-emerald-600" />}
          >
            Summary
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            leftIcon={<UserPlus className="h-4 w-4" />}
            className="text-xs font-semibold px-4 py-2 rounded-xl shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            Add Staff
          </Button>
        )}
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search staff by name or phone..."
            value={searchQuery}
            maxLength={30}
            onChange={(e) => setSearchQuery(e.target.value.slice(0, 30))}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          >
            <option value="ALL">All Roles</option>
            <option value="MANAGER">Counter Managers</option>
            <option value="KITCHEN">Kitchen Staff</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStaffData}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            className="text-xs h-8 px-2.5 rounded-xl border-slate-200 text-slate-700 hover:border-emerald-500"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      {isLoading ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <LoadingState message="Loading staff accounts..." />
        </div>
      ) : error ? (
        <ErrorState title="Failed to load staff" message={error} onRetry={fetchStaffData} />
      ) : filteredStaff.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-slate-500" />}
          title={searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'No staff members found' : 'No staff members yet'}
          description={
            searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No staff members match the selected filters. Try adjusting your search query or filters.'
              : `No staff members added to ${activeBranchName} yet. Add your team members to grant POS cashier and kitchen access.`
          }
          action={
            searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
                leftIcon={<X className="h-4 w-4" />}
              >
                Clear Filters
              </Button>
            ) : canManage ? (
              <Button variant="primary" onClick={handleOpenAdd} leftIcon={<UserPlus className="h-4 w-4" />}>
                Add Staff
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[650px]">
              <DataTable<Staff>
                data={filteredStaff}
                columns={columns}
                keyExtractor={(item: Staff) => item.id}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Add Staff Modal ── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add Team Member to ${activeBranchName}`}
        size="md"
      >
        <form onSubmit={handleCreateStaff} noValidate className="space-y-4">
          {modalApiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Staff Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Ramesh Cashier"
              error={formErrors.name}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number (Login ID) <span className="text-red-500">*</span>
            </label>
            <Input
              value={formPhone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormPhone(val);
                if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="10-digit mobile number"
              maxLength={10}
              error={formErrors.phone}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Login Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showAddPassword ? 'text' : 'password'}
                value={formPassword}
                onChange={(e) => {
                  setFormPassword(e.target.value);
                  if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Minimum 8 characters"
                error={formErrors.password}
                required
              />
              <button
                type="button"
                onClick={() => setShowAddPassword(!showAddPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormRoleType('MANAGER')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  formRoleType === 'MANAGER'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-slate-900">Counter Manager</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Full POS, Cashier & Recharge access</div>
              </button>
              <button
                type="button"
                onClick={() => setFormRoleType('KITCHEN')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  formRoleType === 'KITCHEN'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-slate-900">Kitchen Staff</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Menu, inventory & order viewing only</div>
              </button>
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Staff
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── WhatsApp Credentials Modal ── */}
      <Modal
        isOpen={showStaffCreatedModal}
        onClose={() => setShowStaffCreatedModal(false)}
        title="Staff Created Successfully"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Share these login credentials with <strong className="text-slate-900">{createdCredentials?.name}</strong> so they can log into the Counter POS app.
          </p>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Counter:</span>
              <span className="font-semibold text-slate-900">{createdCredentials?.counterName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Staff Name:</span>
              <span className="font-semibold text-slate-900">{createdCredentials?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Mobile:</span>
              <span className="font-semibold text-slate-900">+91 {createdCredentials?.phone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">Password:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900">
                  {showCreatedPassword ? createdCredentials?.password : '••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCreatedPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => {
                if (!createdCredentials) return;
                const text = `Counter: ${createdCredentials.counterName}\nStaff: ${createdCredentials.name}\nLogin ID: ${createdCredentials.phone}\nPassword: ${createdCredentials.password}`;
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              leftIcon={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            >
              {copied ? 'Copied!' : 'Copy Credentials'}
            </Button>
            <Button
              variant="primary"
              className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (!createdCredentials) return;
                const msg = encodeURIComponent(
                  `Hello ${createdCredentials.name},\nYour staff login credentials for ${createdCredentials.counterName} are:\n\nMobile: ${createdCredentials.phone}\nPassword: ${createdCredentials.password}\n\nPlease keep your credentials secure.`,
                );
                window.open(`https://wa.me/91${createdCredentials.phone}?text=${msg}`, '_blank');
              }}
              leftIcon={<Smartphone className="h-4 w-4" />}
            >
              Share via WhatsApp
            </Button>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowStaffCreatedModal(false)}>
              Done
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── View/Edit Staff Modal ── */}
      <Modal
        isOpen={showStaffDetailsModal}
        onClose={() => setShowStaffDetailsModal(false)}
        title={canManage ? `Staff Settings: ${selectedStaff?.name}` : `Staff Details: ${selectedStaff?.name}`}
        size="md"
      >
        <form onSubmit={handleSaveStaffChanges} noValidate className="space-y-4">
          {modalApiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Staff Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={!canManage}
              error={formErrors.name}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <Input
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              disabled={!canManage}
              maxLength={10}
              error={formErrors.phone}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canManage}
                onClick={() => setFormRoleType('MANAGER')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  formRoleType === 'MANAGER'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-slate-900">Counter Manager</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Full POS, Cashier & Recharge</div>
              </button>
              <button
                type="button"
                disabled={!canManage}
                onClick={() => setFormRoleType('KITCHEN')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  formRoleType === 'KITCHEN'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-slate-900">Kitchen Staff</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Menu & Order view only</div>
              </button>
            </div>
          </div>

          {/* Change Password Section */}
          {canManage && (
            <div className="pt-2 border-t border-slate-200">
              {!showChangePasswordSection ? (
                <button
                  type="button"
                  onClick={() => setShowChangePasswordSection(true)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="h-3.5 w-3.5" />
                  Change Staff Password
                </button>
              ) : (
                <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-800">Set New Password</span>
                    <button
                      type="button"
                      onClick={() => setShowChangePasswordSection(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {passwordChangeError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                      {passwordChangeError}
                    </div>
                  )}
                  {passwordChangeSuccess && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      {passwordChangeSuccess}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={formNewPassword}
                      onChange={(e) => setFormNewPassword(e.target.value)}
                      placeholder="New password (min 8 chars)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    onClick={handleChangePassword}
                    isLoading={isChangingPassword}
                    className="w-full text-xs"
                  >
                    Update Password
                  </Button>
                </div>
              )}
            </div>
          )}

          <ModalFooter className="justify-between">
            {canManage && selectedStaff ? (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowStaffDetailsModal(false);
                  handleOpenDelete(selectedStaff);
                }}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 cursor-pointer"
                leftIcon={<Trash2 className="h-3.5 w-3.5 text-red-600" />}
              >
                Delete Staff
              </Button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={() => setShowStaffDetailsModal(false)}>
                Close
              </Button>
              {canManage && (
                <Button variant="primary" type="submit" isLoading={isSubmitting}>
                  Save Changes
                </Button>
              )}
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove Staff Member"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to remove <strong className="text-slate-900">{staffToDelete?.name}</strong> from this counter? They will no longer be able to log into the POS terminal.
          </p>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              Remove Staff
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Staff Audit / Summary Modal ── */}
      <Modal
        isOpen={!!selectedStaffForAudit}
        onClose={() => setSelectedStaffForAudit(null)}
        title={`${selectedStaffForAudit?.name || 'Staff'} — Daily Activity Summary`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500">Cards Issued</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {auditMetrics.cardsActivatedCount}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500">Recharge Volume</div>
              <div className="text-lg font-bold text-emerald-700 mt-0.5">
                {formatCurrency(auditMetrics.cardRechargeVolume)}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500">Purchase Volume</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {formatCurrency(auditMetrics.purchaseVolume)}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500">Refunds Handled</div>
              <div className="text-lg font-bold text-rose-600 mt-0.5">
                {formatCurrency(auditMetrics.refundVolume)}
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setSelectedStaffForAudit(null)}>
              Close
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
