// ─── Staff Management Page (M6) ───────────────────────────
// Unified Staff Details, Permissions, Branches, and Add Staff UX for ORG_ADMIN.
// Uses apiService abstraction strictly — does NOT call mock handlers directly.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions, useBranch, useAuth } from '@/hooks';
import type {
  Staff,
  Branch,
  Permission,
  OrganizationOverview,
  StaffPerformanceMetric,
  StaffActivityItem,
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
import { MANAGER_PERMISSIONS } from './constants';
import { UnauthorizedPage } from '@/features/auth';
import {
  Users,
  UserPlus,
  Plus,
  Search,
  Edit2,
  Building2,
  RefreshCw,
  AlertCircle,
  Eye, EyeOff,
  Check,
  ArrowRight,
  ArrowLeft,
  User,
  Lock,
  Key,
  X,
  FileSpreadsheet,
  Smartphone,
  Copy,
  ExternalLink,
  Share2,
  Trash2,
} from 'lucide-react';

const getTodayDateStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface CounterStaffGroup {
  id: string;
  counterName: string;
  staff: Staff[];
}

export function StaffPage() {
  const { hasPermission } = usePermissions();
  const { currentBranch } = useBranch();
  const { user } = useAuth();

  const isCounterView = user?.role === 'STAFF';
  const canView = hasPermission('STAFF_VIEW');
  const canManage = hasPermission('STAFF_MANAGE') || isCounterView;

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orgOverview, setOrgOverview] = useState<OrganizationOverview | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Scoped Branches for Counter Manager ─────────────────────
  const scopedBranches = useMemo(() => {
    if (!isCounterView) return branches;
    if (currentBranch && currentBranch.id && currentBranch.id !== 'ALL') {
      return branches.filter((b) => b.id === currentBranch.id);
    }
    if (user?.assignedBranchIds && user.assignedBranchIds.length > 0) {
      return branches.filter((b) => user.assignedBranchIds.includes(b.id));
    }
    return branches;
  }, [branches, isCounterView, currentBranch, user]);

  // ── Unified Staff Details/Edit Modal State ─────────────────
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showStaffDetailsModal, setShowStaffDetailsModal] = useState(false);
  const [staffTab, setStaffTab] = useState<'overview' | 'branches'>('overview');

  // ── Counter Staff Grouping State ───────────────────────────
  const [selectedCounterGroup, setSelectedCounterGroup] = useState<CounterStaffGroup | null>(null);
  const [showCounterStaffModal, setShowCounterStaffModal] = useState(false);
  const [modalCounterSearch, setModalCounterSearch] = useState('');
  const [togglingStaffId, setTogglingStaffId] = useState<string | null>(null);

  const handleOpenStaffDetails = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowStaffDetailsModal(true);
  };

  const handleOpenCounterStaff = (group: CounterStaffGroup) => {
    setSelectedCounterGroup(group);
    setModalCounterSearch('');
    setShowCounterStaffModal(true);
  };

  const handleToggleStaffStatus = async (staff: Staff) => {
    if (!canManage) return;
    const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setTogglingStaffId(staff.id);

    // Optimistic UI update
    setStaffList((prev) =>
      prev.map((s) => (s.id === staff.id ? { ...s, status: newStatus } : s)),
    );
    setSelectedStaff((prev) => (prev && prev.id === staff.id ? { ...prev, status: newStatus } : prev));
    if (selectedCounterGroup) {
      setSelectedCounterGroup((prev) =>
        prev
          ? {
              ...prev,
              staff: prev.staff.map((s) => (s.id === staff.id ? { ...s, status: newStatus } : s)),
            }
          : null,
      );
    }

    try {
      const res = await apiService.staff.updateStaff(staff.id, { status: newStatus });
      if (!res.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, status: staff.status } : s)),
        );
        setSelectedStaff((prev) => (prev && prev.id === staff.id ? { ...prev, status: staff.status } : prev));
        if (selectedCounterGroup) {
          setSelectedCounterGroup((prev) =>
            prev
              ? {
                  ...prev,
                  staff: prev.staff.map((s) => (s.id === staff.id ? { ...s, status: staff.status } : s)),
                }
              : null,
          );
        }
        notify.error(res.error.message || 'Failed to change staff status');
        return;
      }

      notify.success(
        `Staff member ${staff.name} is now ${newStatus === 'ACTIVE' ? 'Active' : 'Inactive'}`,
      );
    } catch {
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, status: staff.status } : s)),
      );
      setSelectedStaff((prev) => (prev && prev.id === staff.id ? { ...prev, status: staff.status } : prev));
      notify.error('An unexpected error occurred while updating status.');
    } finally {
      setTogglingStaffId(null);
    }
  };

  // ── Staff Password Change State ─────────────────────────────
  const [formNewPassword, setFormNewPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStaffPassword, setCurrentStaffPassword] = useState('123456');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);

  // ── Persistent Staff Password Cache ──────────────────────────
  const STAFF_PASSWORDS_KEY = 'mc_staff_passwords';
  const BRANCH_PASSWORDS_KEY = 'mc_branch_passwords';

  const getStoredStaffPassword = (staffId?: string, branchIds?: string[], phone?: string): string | null => {
    try {
      const staffMap = JSON.parse(localStorage.getItem(STAFF_PASSWORDS_KEY) || '{}');
      const branchMap = JSON.parse(localStorage.getItem(BRANCH_PASSWORDS_KEY) || '{}');
      const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

      if (staffId && staffMap[staffId]) return staffMap[staffId];
      if (cleanPhone && staffMap[cleanPhone]) return staffMap[cleanPhone];
      if (cleanPhone && branchMap[cleanPhone]) return branchMap[cleanPhone];
      if (branchIds && branchIds.length > 0) {
        for (const bid of branchIds) {
          if (branchMap[bid]) return branchMap[bid];
          if (staffMap[bid]) return staffMap[bid];
        }
      }
    } catch {}
    return null;
  };

  const storeStaffPassword = (staffId: string, pass: string, phone?: string, branchIds?: string[]): void => {
    try {
      if (!pass) return;
      const staffMap = JSON.parse(localStorage.getItem(STAFF_PASSWORDS_KEY) || '{}');
      const branchMap = JSON.parse(localStorage.getItem(BRANCH_PASSWORDS_KEY) || '{}');
      const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

      if (staffId) staffMap[staffId] = pass;
      if (cleanPhone) {
        staffMap[cleanPhone] = pass;
        branchMap[cleanPhone] = pass;
      }
      if (branchIds && branchIds.length > 0) {
        for (const bid of branchIds) {
          branchMap[bid] = pass;
          staffMap[bid] = pass;
        }
      }
      localStorage.setItem(STAFF_PASSWORDS_KEY, JSON.stringify(staffMap));
      localStorage.setItem(BRANCH_PASSWORDS_KEY, JSON.stringify(branchMap));
    } catch {}
  };


  // ── Delete Staff Confirmation State ─────────────────────────
  const [showDeleteStaffConfirmModal, setShowDeleteStaffConfirmModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  // ── Add Staff Modal State & Multi-step Tabs ─────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<'basic' | 'branches'>('basic');

  const [showStaffCreatedModal, setShowStaffCreatedModal] = useState(false);
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState<{
    name: string;
    phone: string;
    password: string;
    branchIds?: string[];
  } | null>(null);

  // Status & Counter Filters matching Menu design pattern
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [staffBranchFilter, setStaffBranchFilter] = useState<string>('ALL');

  // ── Form & Selection State ────────────────────────────────
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [formBranchIds, setFormBranchIds] = useState<string[]>([]);
  const [formPermissions, setFormPermissions] = useState<Permission[]>([]);

  // ── Staff Performance & Operational Audit State ───────────
  const [selectedStaffForAudit, setSelectedStaffForAudit] = useState<Staff | null>(null);
  const [staffPerformanceList, setStaffPerformanceList] = useState<StaffPerformanceMetric[]>([]);
  const [auditStartDate, setAuditStartDate] = useState<string>(getTodayDateStr);
  const [auditEndDate, setAuditEndDate] = useState<string>(getTodayDateStr);
  const [auditDatePreset, setAuditDatePreset] = useState<'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME'>('TODAY');
  const [auditActivityTypeFilter, setAuditActivityTypeFilter] = useState<'ALL' | 'CARD_ACTIVATION' | 'RECHARGE' | 'PURCHASE' | 'CARD_SETTLEMENT' | 'REFUND' | 'OTHER'>('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // ── Validation & Error state ──────────────────────────────
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Staff, Analytics & Organization Branches ─────────
  const fetchStaffData = useCallback(async () => {
    setError(null);
    try {
      const [staffRes, branchRes, orgRes, analyticsRes] = await Promise.all([
        apiService.staff.getStaff({ search: searchQuery }),
        apiService.branches.getBranches(),
        apiService.organizations.getOrganization(),
        apiService.analytics.getOverview(),
      ]);

      if (!staffRes.success) {
        setError(staffRes.error.message || 'Failed to load staff list');
        return;
      }

      setStaffList(staffRes.data.items);

      if (branchRes.success) {
        setBranches(branchRes.data.items);
      }
      if (orgRes.success) {
        setOrgOverview(orgRes.data);
      }
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
        const [staffRes, branchRes, orgRes, analyticsRes] = await Promise.all([
          apiService.staff.getStaff({ search: searchQuery }),
          apiService.branches.getBranches(),
          apiService.organizations.getOrganization(),
          apiService.analytics.getOverview(),
        ]);
        if (isCancelled) return;

        if (!staffRes.success) {
          setError(staffRes.error.message || 'Failed to load staff list');
          return;
        }

        setStaffList(staffRes.data.items);
        if (branchRes.success) setBranches(branchRes.data.items);
        if (orgRes.success) setOrgOverview(orgRes.data);
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

  // ── Instant Client-Side Filtered Staff ────────────────────
  const filteredStaff = useMemo(() => {
    let result = staffList;
    const activeBranchId = isCounterView
      ? currentBranch?.id
      : staffBranchFilter !== 'ALL'
      ? staffBranchFilter
      : currentBranch && currentBranch.id && currentBranch.id !== 'ALL'
      ? currentBranch.id
      : 'ALL';

    if (activeBranchId && activeBranchId !== 'ALL') {
      result = result.filter(
        (s) => Array.isArray(s.assignedBranchIds) && s.assignedBranchIds.includes(activeBranchId),
      );
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();
    return result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)),
    );
  }, [staffList, currentBranch, staffBranchFilter, statusFilter, searchQuery, isCounterView]);

  // ── Group Filtered Staff by Counter (Minimal & Clean) ─────
  const counterStaffGroups = useMemo<CounterStaffGroup[]>(() => {
    const targetBranches = isCounterView
      ? scopedBranches
      : staffBranchFilter !== 'ALL'
      ? branches.filter((b) => b.id === staffBranchFilter)
      : branches;

    const groups: CounterStaffGroup[] = [];
    const q = searchQuery.toLowerCase().trim();

    targetBranches.forEach((branch) => {
      const isBranchNameMatch = q ? branch.name.toLowerCase().includes(q) : false;
      const assigned = filteredStaff.filter(
        (s) => Array.isArray(s.assignedBranchIds) && s.assignedBranchIds.includes(branch.id),
      );
      if (isBranchNameMatch) {
        const branchStaff = staffList.filter(
          (s) =>
            Array.isArray(s.assignedBranchIds) &&
            s.assignedBranchIds.includes(branch.id) &&
            (statusFilter === 'ALL' || s.status === statusFilter),
        );
        groups.push({
          id: branch.id,
          counterName: branch.name,
          staff: branchStaff,
        });
      } else if (!q && statusFilter === 'ALL') {
        groups.push({
          id: branch.id,
          counterName: branch.name,
          staff: assigned,
        });
      } else if (assigned.length > 0) {
        groups.push({
          id: branch.id,
          counterName: branch.name,
          staff: assigned,
        });
      }
    });

    return groups;
  }, [branches, scopedBranches, filteredStaff, staffList, isCounterView, staffBranchFilter, searchQuery, statusFilter]);

  // If user lacks STAFF_VIEW permission, block access
  if (!canView) {
    return <UnauthorizedPage />;
  }

  // ── Open Add Staff Modal ──────────────────────────────────
  const handleOpenAdd = (defaultBranchId?: string) => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setShowAddPassword(false);
    const defaultBranchIds = defaultBranchId
      ? [defaultBranchId]
      : isCounterView
      ? scopedBranches.map((b) => b.id)
      : branches.map((b) => b.id);
    setFormBranchIds(defaultBranchIds);
    setFormPermissions([...MANAGER_PERMISSIONS]);
    setFormErrors({});
    setModalApiError(null);
    setAddTab('basic');
    setShowAddModal(true);
  };

  // ── Validate Add Staff Step 1 ──────────────────────────────
  const validateBasicInfo = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) {
      errors.name = 'Staff name is required';
    } else if (formName.trim().length < 2) {
      errors.name = 'Staff name must be at least 2 characters';
    } else if (formName.trim().length > 50) {
      errors.name = 'Staff name must be at most 50 characters';
    }

    const cleanPhone = formPhone.trim().replace(/\D/g, '').slice(-10);
    if (!cleanPhone) {
      errors.phone = 'Phone number is required';
    } else if (cleanPhone.length !== 10) {
      errors.phone = 'Please provide a valid 10-digit phone number';
    }

    if (!formPassword.trim()) {
      errors.password = 'Initial password is required for POS login';
    } else if (formPassword.trim().length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }

    const trimmedEmail = formEmail.trim().toLowerCase();
    if (trimmedEmail && !/\S+@\S+\.\S+/.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit Add Staff ──────────────────────────────────────
  const handleAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateBasicInfo()) {
      setAddTab('basic');
      notify.error('Please fix the errors in Basic Information before creating');
      return;
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const clean10Phone = formPhone.trim().replace(/\D/g, '').slice(-10);
      const finalPermissions = new Set(formPermissions);
      // Ensure all manager permissions are assigned
      MANAGER_PERMISSIONS.forEach((p) => finalPermissions.add(p));

      const res = await apiService.staff.createStaff({
        name: formName.trim(),
        phone: clean10Phone,
        password: formPassword.trim(),
        email: formEmail.trim() ? formEmail.trim().toLowerCase() : undefined,
        assignedBranchIds: formBranchIds,
        permissions: Array.from(finalPermissions),
      });

      if (!res.success) {
        if (res.error.code === 'PLAN_LIMIT_REACHED') {
          setModalApiError(
            res.error.message ||
              'Staff limit reached for your active plan. Upgrade your plan to add more staff.',
          );
        } else {
          setModalApiError(res.error.message || 'Failed to add staff member');
        }
        return;
      }

      notify.success(`Staff member ${res.data.name} created and activated!`);
      if (res.data?.id && formPassword.trim()) {
        storeStaffPassword(res.data.id, formPassword.trim());
      }
      setCreatedStaffCredentials({
        name: res.data.name,
        phone: clean10Phone,
        password: formPassword.trim(),
        branchIds: formBranchIds,
      });
      setShowStaffCreatedModal(true);
      setShowAddModal(false);
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Unified Staff Details/Edit Modal ─────────────────
  const handleOpenStaffModal = (
    staff: Staff,
    initialTab: 'overview' | 'branches' = 'overview',
  ) => {
    setSelectedStaff(staff);
    setFormName(formatStaffDisplayName(staff.name, staff.assignedBranchIds));
    setFormPhone(staff.phone || '');
    setFormEmail(staff.email || '');
    setFormBranchIds(staff.assignedBranchIds);
    setFormPermissions(staff.permissions);
    setStaffTab(initialTab);
    setFormErrors({});
    setModalApiError(null);
    const savedPassword = getStoredStaffPassword(staff.id, staff.assignedBranchIds, staff.phone);
    const initialPassword = savedPassword || staff.credentials?.password || '123456';
    setCurrentStaffPassword(initialPassword);
    setShowCurrentPassword(false);
    setFormNewPassword('');
    setFormConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);
    setShowStaffModal(true);
  };

  // ── Handle Staff Password Change ──────────────────────────
  const validateStaffPassword = (): string | null => {
    if (!formNewPassword) return 'New password is required';
    if (formNewPassword.length < 4) return 'Password must be at least 4 characters long';
    if (formNewPassword.length > 128) return 'Password cannot exceed 128 characters';
    if (formNewPassword !== formConfirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleChangeStaffPassword = async () => {
    if (!selectedStaff) return;
    const validationErr = validateStaffPassword();
    if (validationErr) {
      setPasswordChangeError(validationErr);
      return;
    }

    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);
    setIsChangingPassword(true);

    try {
      const res = await apiService.staff.changePassword(selectedStaff.id, {
        newPassword: formNewPassword,
        confirmPassword: formConfirmPassword,
      });

      if (!res.success) {
        setPasswordChangeError(res.error?.message || 'Failed to change staff password');
        return;
      }

      notify.success('Staff password changed successfully.');
      setPasswordChangeSuccess(
        `Staff password changed successfully for ${selectedStaff.name}. All active mobile app and web sessions have been invalidated.`,
      );
      if (formNewPassword.trim()) {
        storeStaffPassword(selectedStaff.id, formNewPassword.trim(), selectedStaff.phone, selectedStaff.assignedBranchIds);
        setCurrentStaffPassword(formNewPassword.trim());
      }
      setFormNewPassword('');
      setFormConfirmPassword('');
    } catch {
      setPasswordChangeError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── Share & Copy Staff Credentials from Edit Modal ────────
  const handleCopyCredentialsFromEdit = () => {
    if (!selectedStaff) return;
    const pwdText =
      formNewPassword.trim() ||
      currentStaffPassword ||
      getStoredStaffPassword(selectedStaff.id, formBranchIds, selectedStaff.phone) ||
      '123456';
    const cleanPhone = (formPhone || selectedStaff.phone || '').replace(/\D/g, '').slice(-10);
    const assignedBranchesText =
      branches
        .filter((b) => formBranchIds.includes(b.id))
        .map((b) => b.name)
        .join(', ') || 'All Counters';
    const loginUrl = `${window.location.origin}/login`;

    const text =
      `Staff Login Credentials:\n` +
      `Name: ${formName.trim() || selectedStaff.name}\n` +
      `Phone: ${cleanPhone}\n` +
      `Password: ${pwdText}\n` +
      `Counter: ${assignedBranchesText}\n` +
      `Login URL: ${loginUrl}`;

    navigator.clipboard.writeText(text);
    notify.success('Staff credentials copied to clipboard!');
  };

  const handleSendWhatsAppFromEdit = () => {
    if (!selectedStaff) return;
    const cleanPhone = (formPhone || selectedStaff.phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      notify.error('Please enter a valid 10-digit mobile number to send via WhatsApp');
      return;
    }

    const pwdText =
      formNewPassword.trim() ||
      currentStaffPassword ||
      getStoredStaffPassword(selectedStaff.id, formBranchIds, selectedStaff.phone) ||
      '123456';
    const assignedBranchesText =
      branches
        .filter((b) => formBranchIds.includes(b.id))
        .map((b) => b.name)
        .join(', ') || 'All Counters';
    const loginUrl = `${window.location.origin}/login`;

    const message =
      `*Money Card Staff Credentials*\n\n` +
      `Hello ${formName.trim() || selectedStaff.name},\n\n` +
      `Here are your updated staff login credentials:\n\n` +
      `*Counter:* ${assignedBranchesText}\n` +
      `*Mobile Number:* ${cleanPhone}\n` +
      `*Password:* ${pwdText}\n\n` +
      `*POS Login Link:* ${loginUrl}\n\n` +
      `Log in using your Mobile Number and Password to access your counter POS.`;

    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // ── Initiate & Confirm Delete Staff ───────────────────────
  const handleInitiateDelete = (staff: Staff) => {
    setStaffToDelete(staff);
    setShowDeleteStaffConfirmModal(true);
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    setIsDeletingStaff(true);
    try {
      const res = await apiService.staff.deleteStaff(staffToDelete.id);
      if (!res.success) {
        notify.error(res.error?.message || 'Failed to delete staff member');
        return;
      }
      notify.success(`Staff member "${staffToDelete.name}" deleted successfully`);
      setShowDeleteStaffConfirmModal(false);
      setShowStaffModal(false);
      setShowStaffDetailsModal(false);
      setStaffToDelete(null);
      fetchStaffData();
    } catch {
      notify.error('Network error while deleting staff member');
    } finally {
      setIsDeletingStaff(false);
    }
  };

  // ── Save Unified Staff Details & Permissions & Branches ───
  //  Save Staff Profile Information
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStaff) return;

    const errors: Record<string, string> = {};
    if (!formName.trim()) {
      errors.name = 'Staff name is required';
    } else if (formName.trim().length > 20) {
      errors.name = 'Staff name cannot exceed 20 characters';
    }

    const cleanPhone = formPhone.trim().replace(/\D/g, '').slice(-10);
    if (!cleanPhone) {
      errors.phone = 'Phone number is required';
    } else if (cleanPhone.length !== 10) {
      errors.phone = 'Please provide a valid 10-digit phone number';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setStaffTab('overview');
      return;
    }

    // If new password is entered, validate it before saving
    if (formNewPassword) {
      const pwdErr = validateStaffPassword();
      if (pwdErr) {
        setPasswordChangeError(pwdErr);
        setStaffTab('overview');
        return;
      }
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.staff.updateStaff(selectedStaff.id, {
        name: formName.trim(),
        phone: cleanPhone || undefined,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update staff profile');
        return;
      }

      if (formNewPassword) {
        const pwdRes = await apiService.staff.changePassword(selectedStaff.id, {
          newPassword: formNewPassword,
          confirmPassword: formConfirmPassword,
        });
        if (!pwdRes.success) {
          setPasswordChangeError(pwdRes.error?.message || 'Profile saved, but failed to update password');
        } else {
          storeStaffPassword(selectedStaff.id, formNewPassword.trim(), cleanPhone || selectedStaff.phone, selectedStaff.assignedBranchIds);
          setCurrentStaffPassword(formNewPassword.trim());
          setPasswordChangeSuccess('Password updated successfully.');
        }
      }

      notify.success('Staff profile updated successfully.');
      setSelectedStaff((prev) =>
        prev
          ? {
              ...prev,
              name: formName.trim(),
              phone: cleanPhone || prev.phone,
            }
          : null,
      );
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  //  Save Staff Branch Assignments
  const handleSaveBranches = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStaff) return;

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.staff.updateStaffBranches(selectedStaff.id, formBranchIds);

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update cafeteria assignments');
        return;
      }

      notify.success('Cafeteria assignments updated successfully.');
      setSelectedStaff((prev) => (prev ? { ...prev, assignedBranchIds: formBranchIds } : null));
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveStaffChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Staff name is required';
    if (formPhone.trim()) {
      const cleanPhone = formPhone.trim().replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        errors.phone = 'Please provide a valid 10-digit phone number';
      }
    }
    if (formEmail.trim() && !/\S+@\S+\.\S+/.test(formEmail)) {
      errors.email = 'Enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setStaffTab('overview');
      return;
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.staff.updateStaff(selectedStaff.id, {
        name: formName.trim(),
        phone: formPhone.trim().replace(/\D/g, '').slice(-10) || undefined,
        email: formEmail.trim() || undefined,
        assignedBranchIds: formBranchIds,
        permissions: formPermissions,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update staff member');
        return;
      }

      notify.success('Staff profile, permissions, and cafeteria assignments updated successfully');
      setShowStaffModal(false);
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Staff Performance & Operational Audit Helpers ────────
  const formatStaffDisplayName = (name?: string, _assignedBranchIds?: string[], _fallbackCounterName?: string): string => {
    if (!name) return '';
    let cleaned = name.trim();
    cleaned = cleaned.replace(/^(counter\s*)+manager\s*[-:]?\s*/i, '');
    cleaned = cleaned.replace(/^counter\s*counter\s*manager\s*[-:]?\s*/i, '');
    cleaned = cleaned.replace(/^counter\s*manager\s*[-:]?\s*/i, '');
    cleaned = cleaned.trim();
    if (!cleaned) return name.trim();
    return cleaned;
  };

  const getStaffRoleLabel = (staff: Staff): string => {
    if (staff.permissions.includes('RECHARGE') || staff.permissions.includes('STAFF_MANAGE')) {
      return 'Manager';
    }
    return 'Staff';
  };

  const handleOpenStaffAudit = async (staff: Staff) => {
    setSelectedStaffForAudit(staff);
    const today = getTodayDateStr();
    setAuditStartDate(today);
    setAuditEndDate(today);
    setAuditDatePreset('TODAY');
    setAuditActivityTypeFilter('ALL');
    setAuditSearch('');

    try {
      const res = await apiService.analytics.getOverview();
      if (res.success && res.data.staffPerformance) {
        setStaffPerformanceList(res.data.staffPerformance);
      }
    } catch {
      // Ignored
    }
  };

  const handleDatePresetChange = (preset: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME') => {
    setAuditDatePreset(preset);
    const now = new Date();
    if (preset === 'TODAY') {
      const today = getTodayDateStr();
      setAuditStartDate(today);
      setAuditEndDate(today);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      setAuditStartDate(yStr);
      setAuditEndDate(yStr);
    } else if (preset === 'THIS_WEEK') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const mStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      setAuditStartDate(mStr);
      setAuditEndDate(getTodayDateStr());
    } else if (preset === 'THIS_MONTH') {
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setAuditStartDate(firstDay);
      setAuditEndDate(getTodayDateStr());
    } else if (preset === 'ALL_TIME') {
      setAuditStartDate('');
      setAuditEndDate('');
    }
  };

  const getActivityDetails = (act: StaffActivityItem) => {
    let title = 'Activity';
    let badgeLabel = 'Activity';
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let amountText = act.amount !== undefined ? formatCurrency(act.amount) : '—';
    let amountClass = 'text-slate-900';

    if (act.type === 'CARD_ACTIVATION') {
      title = 'New Wallet Issued';
      badgeLabel = 'Wallet';
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      amountText = act.amount !== undefined && act.amount > 0 ? `+${formatCurrency(act.amount)}` : (act.cardNumber ? `#${act.cardNumber}` : 'Issued');
      amountClass = act.amount !== undefined && act.amount > 0 ? 'text-emerald-600' : 'text-slate-700';
    } else if (act.type === 'RECHARGE_CASH') {
      title = 'Money Loaded (Cash)';
      badgeLabel = 'Cash';
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      amountText = act.amount !== undefined ? `+${formatCurrency(act.amount)}` : '—';
      amountClass = 'text-emerald-600';
    } else if (act.type === 'RECHARGE_UPI') {
      title = 'Money Loaded (UPI)';
      badgeLabel = 'UPI';
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      amountText = act.amount !== undefined ? `+${formatCurrency(act.amount)}` : '—';
      amountClass = 'text-emerald-600';
    } else if (act.type === 'PURCHASE') {
      title = 'Order / Meal Sold';
      badgeLabel = 'Order';
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
      amountText = act.amount !== undefined ? formatCurrency(act.amount) : '—';
      amountClass = 'text-slate-900';
    } else if (act.type === 'CARD_SETTLEMENT') {
      title = 'Wallet Closed / Returned';
      badgeLabel = 'Closed';
      badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
      amountText = act.amount !== undefined && act.amount > 0 ? formatCurrency(act.amount) : 'Settled';
      amountClass = 'text-slate-500';
    } else if (act.type === 'REFUND') {
      title = 'Money Refunded';
      badgeLabel = 'Refund';
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200/70';
      amountText = act.amount !== undefined ? `-${formatCurrency(act.amount)}` : '—';
      amountClass = 'text-rose-600';
    } else if (act.type === 'CARD_BLOCKED') {
      title = 'Wallet Blocked';
      badgeLabel = 'Blocked';
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200/70';
      amountText = 'Blocked';
      amountClass = 'text-rose-600';
    }

    let timeStr = '—';
    if (act.timestamp) {
      try {
        const d = new Date(act.timestamp);
        timeStr = d.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        timeStr = '—';
      }
    }

    return { title, badgeLabel, badgeClass, amountText, amountClass, timeStr };
  };

  const targetStaffMetric = useMemo(() => {
    if (!selectedStaffForAudit) return null;
    return (
      staffPerformanceList.find(
        (p) =>
          p.staffId === selectedStaffForAudit.id ||
          (selectedStaffForAudit.email &&
            p.staffEmail?.toLowerCase() === selectedStaffForAudit.email.toLowerCase()),
      ) || {
        staffId: selectedStaffForAudit.id,
        staffName: selectedStaffForAudit.name,
        staffEmail: selectedStaffForAudit.email || selectedStaffForAudit.phone || 'N/A',
        role: getStaffRoleLabel(selectedStaffForAudit),
        status: selectedStaffForAudit.status,
        branchId: selectedStaffForAudit.assignedBranchIds[0],
        branchName: branches.find((b) => selectedStaffForAudit.assignedBranchIds.includes(b.id))?.name || 'Main Branch',
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
  }, [selectedStaffForAudit, staffPerformanceList, branches]);

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
    return calculateScopedStaffMetrics(scopedAuditActivities);
  }, [targetStaffMetric, scopedAuditActivities]);

  // ── Modal Filtered Staff & Counter Matching ────────────────
  const displayedModalStaff = useMemo(() => {
    if (!selectedCounterGroup) return [];
    if (!modalCounterSearch.trim()) return selectedCounterGroup.staff;
    const q = modalCounterSearch.toLowerCase().trim();
    return selectedCounterGroup.staff.filter(
      (st) =>
        st.name.toLowerCase().includes(q) ||
        (st.phone && st.phone.includes(q)) ||
        (st.permissions.includes('STAFF_MANAGE') && 'manager admin'.includes(q)) ||
        'cashier pos'.includes(q),
    );
  }, [selectedCounterGroup, modalCounterSearch]);

  const otherMatchingCounters = useMemo(() => {
    if (!modalCounterSearch.trim() || !selectedCounterGroup) return [];
    const q = modalCounterSearch.toLowerCase().trim();
    return counterStaffGroups.filter(
      (g) => g.id !== selectedCounterGroup.id && g.counterName.toLowerCase().includes(q),
    );
  }, [counterStaffGroups, selectedCounterGroup, modalCounterSearch]);

  // ── Table Columns for ORG_ADMIN (Counter-Grouped View) ─────────
  const orgAdminColumns = [
    {
      key: 'counterName',
      header: 'Counter Name',
      className: 'w-1/2 min-w-[200px]',
      render: (group: CounterStaffGroup) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">Staff - {group.counterName}</span>
        </div>
      ),
    },
    {
      key: 'addStaff',
      header: 'Add Staff',
      className: 'w-36 text-center',
      render: (group: CounterStaffGroup) => (
        <div className="flex items-center justify-center">
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAdd(group.id)}
              className="text-xs font-semibold py-1.5 px-3 rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all shadow-2xs cursor-pointer"
              leftIcon={<Plus className="h-3.5 w-3.5 text-emerald-600" />}
            >
              Add
            </Button>
          )}
        </div>
      ),
    },
    {
      key: 'staffDetails',
      header: 'Staff Details',
      className: 'w-44 text-right',
      render: (group: CounterStaffGroup) => (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenCounterStaff(group)}
            className="text-xs font-semibold py-1.5 px-3 rounded-lg border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-2xs cursor-pointer"
            leftIcon={<Users className="h-3.5 w-3.5 text-emerald-600" />}
          >
            Staff Details {group.staff.length > 0 ? `(${group.staff.length})` : ''}
          </Button>
        </div>
      ),
    },
  ];

  // ── Table Columns for Counter Staff (Table View: Staff Name, Role, Actions) ─────────
  const counterStaffColumns = [
    {
      key: 'name',
      header: 'Staff Name',
      className: 'min-w-[180px]',
      render: (staff: Staff) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <User className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">
            {formatStaffDisplayName(staff.name, staff.assignedBranchIds)}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      className: 'w-32',
      render: (staff: Staff) => (
        <Badge
          variant="outline"
          className={
            getStaffRoleLabel(staff) === 'Manager'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-xs'
              : 'border-slate-200 bg-slate-50 text-slate-700 text-xs'
          }
        >
          {getStaffRoleLabel(staff)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right min-w-[280px]',
      render: (staff: Staff) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenStaffDetails(staff)}
            className="text-xs h-7 px-2.5 rounded-lg border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-2xs cursor-pointer"
            leftIcon={<Eye className="h-3 w-3 text-emerald-600" />}
          >
            View Details
          </Button>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenStaffModal(staff, 'overview')}
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
            Performance & Audit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* ─── Minimal Header ─── */}
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
      </div>

      {/* Plan Resource Usage Indicator */}
      {orgOverview?.usage && (
        <div className="text-xs text-slate-600 font-medium">
          Staff Usage:{' '}
          <strong className="text-slate-900">{orgOverview.usage.staffCount}</strong> /{' '}
          {orgOverview.usage.staffLimit} staff accounts created
        </div>
      )}

      {/* ─── Search & Status Filters ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={isCounterView ? "Search staff by name or phone..." : "Search counters or staff by name, phone..."}
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

      {/* Main Content */}
      {isLoading ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200/80">
          <LoadingState message="Loading staff accounts..." />
        </div>
      ) : error ? (
        <ErrorState title="Failed to load staff" message={error} onRetry={fetchStaffData} />
      ) : staffList.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-slate-500" />}
          title="No staff accounts yet"
          description="Add your team members to grant POS cashier and counter access."
          action={
            canManage ? (
              <Button variant="primary" onClick={() => handleOpenAdd()} leftIcon={<UserPlus className="h-4 w-4" />}>
                Add First Staff Member
              </Button>
            ) : undefined
          }
        />
      ) : counterStaffGroups.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-slate-500" />}
          title="No staff members found"
          description={
            searchQuery || statusFilter !== 'ALL' || staffBranchFilter !== 'ALL'
              ? 'No staff members match the selected filters. Try adjusting your search query or filters.'
              : `No staff members assigned to ${currentBranch ? currentBranch.name : 'this counter'}.`
          }
          action={
            searchQuery || statusFilter !== 'ALL' || staffBranchFilter !== 'ALL' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setStaffBranchFilter('ALL');
                }}
                leftIcon={<X className="h-4 w-4" />}
              >
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {isCounterView ? (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <DataTable<Staff>
                  data={filteredStaff}
                  columns={counterStaffColumns}
                  keyExtractor={(item: Staff) => item.id}
                />
              </div>
            </div>
          ) : (
            <DataTable<CounterStaffGroup>
              data={counterStaffGroups}
              columns={orgAdminColumns}
              keyExtractor={(item: CounterStaffGroup) => item.id}
            />
          )}
        </div>
      )}

      {/* ── 1. UNIFIED STAFF DETAILS & EDIT MODAL (WITH HORIZONTAL TABS) ── */}
      <Modal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        title={canManage ? `Staff Settings: ${formatStaffDisplayName(selectedStaff?.name, selectedStaff?.assignedBranchIds)}` : `Staff Details: ${formatStaffDisplayName(selectedStaff?.name, selectedStaff?.assignedBranchIds)}`}
        size="xl"
      >
        <form onSubmit={handleSaveStaffChanges} noValidate className="space-y-6">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          {/* Horizontal Navigation Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
            <button
              type="button"
              onClick={() => setStaffTab('overview')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                staffTab === 'overview'
                  ? 'border-emerald-600 text-emerald-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setStaffTab('branches')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                staffTab === 'branches'
                  ? 'border-emerald-600 text-emerald-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Counters</span>
              <Badge variant="outline" className="text-[10px] ml-1">
                {formBranchIds.length}
              </Badge>
            </button>
          </div>

          {/* Tab Content Panes */}
          <div className="max-h-[64vh] overflow-y-auto pr-1">
            {/* ── TAB 1: OVERVIEW (PROFILE & INTEGRATED SECURITY) ── */}
            {staffTab === 'overview' && (
              <div className="space-y-4">
                {/* Account Details & Edit Fields */}
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Staff Profile Information
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="staff-edit-name"
                      label="Full Name"
                      value={formName}
                      maxLength={20}
                      onChange={(e) => {
                        setFormName(e.target.value.slice(0, 20));
                        if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      error={formErrors.name}
                      disabled={!canManage || isSubmitting}
                    />

                    <Input
                      id="staff-edit-phone"
                      label="Phone Number"
                      placeholder="e.g. 9876543210"
                      value={formPhone}
                      maxLength={10}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormPhone(clean);
                        if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      error={formErrors.phone}
                      disabled={!canManage || isSubmitting}
                    />

                    {/* Status Slide Toggle Switch inside Edit Modal */}
                    <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Account Status</div>
                        <div className="text-[11px] text-slate-500">
                          {selectedStaff?.status === 'ACTIVE'
                            ? 'Account is active and permitted to use the counter terminal.'
                            : 'Account is deactivated and cannot log in.'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${selectedStaff?.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {selectedStaff?.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          type="button"
                          disabled={!canManage || togglingStaffId === selectedStaff?.id}
                          onClick={() => selectedStaff && handleToggleStaffStatus(selectedStaff)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                            selectedStaff?.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                          aria-label="Toggle staff status"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow-xs ${
                              selectedStaff?.status === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unified Security & Change Password Section */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Password & Credentials
                      </h4>
                    </div>
                    {formNewPassword && (
                      <span className="text-[11px] text-amber-600 font-medium">Unsaved password changes</span>
                    )}
                  </div>

                  {passwordChangeError && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span>{passwordChangeError}</span>
                    </div>
                  )}

                  {passwordChangeSuccess && (
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{passwordChangeSuccess}</span>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      id="staff-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      label="New Password"
                      placeholder="Enter new password"
                      value={formNewPassword}
                      onChange={(e) => {
                        setFormNewPassword(e.target.value);
                        if (passwordChangeError) setPasswordChangeError(null);
                      }}
                      disabled={!canManage || isChangingPassword}
                      autoComplete="new-password"
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 flex items-center justify-center cursor-pointer"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />

                    <Input
                      id="staff-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      label="Confirm New Password"
                      placeholder="Re-enter new password"
                      value={formConfirmPassword}
                      onChange={(e) => {
                        setFormConfirmPassword(e.target.value);
                        if (passwordChangeError) setPasswordChangeError(null);
                      }}
                      disabled={!canManage || isChangingPassword}
                      autoComplete="new-password"
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 flex items-center justify-center cursor-pointer"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                  </div>

                  {/* Current Password Display Card */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                        Current Password
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {showCurrentPassword ? (formNewPassword.trim() || currentStaffPassword) : '••••••••'}
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

                  {/* Action & Credentials Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    {canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleChangeStaffPassword}
                        disabled={isChangingPassword || !formNewPassword || !formConfirmPassword}
                        isLoading={isChangingPassword}
                        leftIcon={<Key className="h-3.5 w-3.5" />}
                        className="text-xs h-8"
                      >
                        Update Password
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCredentialsFromEdit}
                      className="flex-1 justify-center gap-1.5 text-xs h-8 bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                      leftIcon={<Copy className="h-3.5 w-3.5 text-slate-500" />}
                    >
                      Copy Credentials
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendWhatsAppFromEdit}
                      className="flex-1 justify-center gap-1.5 text-xs h-8 bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent cursor-pointer font-medium"
                      leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                    >
                      Send via WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: COUNTERS ── */}
            {staffTab === 'branches' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Cafeteria Counter Assignments
                  </h4>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {branches.map((branch) => {
                    const isSelected = formBranchIds.includes(branch.id);
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        disabled={!canManage}
                        onClick={() => {
                          if (isSelected) {
                            setFormBranchIds(formBranchIds.filter((id) => id !== branch.id));
                          } else {
                            setFormBranchIds([...formBranchIds, branch.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        } ${!canManage ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold">{branch.name}</p>
                          </div>
                        </div>
                        <Badge
                          variant={isSelected ? 'success' : 'outline'}
                          className="text-[10px]"
                        >
                          {isSelected ? 'Assigned' : 'Unassigned'}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <ModalFooter className="w-full flex items-center justify-between">
            <div>
              {canManage && selectedStaff && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={selectedStaff.id === user?.id || isSubmitting}
                  title={selectedStaff.id === user?.id ? 'Cannot delete your own account' : 'Delete staff member'}
                  className="text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => handleInitiateDelete(selectedStaff)}
                >
                  Delete Staff
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowStaffModal(false)} disabled={isSubmitting}>
                Close
              </Button>
              {canManage && staffTab === 'overview' && (
                <Button type="button" variant="primary" onClick={handleSaveProfile} isLoading={isSubmitting} disabled={isSubmitting}>
                  Save Staff Information
                </Button>
              )}
              {canManage && staffTab === 'branches' && (
                <Button type="button" variant="primary" onClick={handleSaveBranches} isLoading={isSubmitting} disabled={isSubmitting} leftIcon={<Building2 className="h-4 w-4" />}>
                  Save Branches
                </Button>
              )}
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── DELETE STAFF CONFIRMATION MODAL ── */}
      <Modal
        isOpen={showDeleteStaffConfirmModal}
        onClose={() => {
          if (!isDeletingStaff) {
            setShowDeleteStaffConfirmModal(false);
            setStaffToDelete(null);
          }
        }}
        title="Delete Staff Member"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-800">
            <p className="font-semibold text-sm text-rose-900 mb-1">Are you sure you want to delete this staff member?</p>
            <p>
              This will permanently remove <strong>{formatStaffDisplayName(staffToDelete?.name, staffToDelete?.assignedBranchIds)}</strong> from your organization. They will no longer be able to log in to the POS or counter.
            </p>
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDeleteStaffConfirmModal(false);
                setStaffToDelete(null);
              }}
              disabled={isDeletingStaff}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDeleteStaff}
              isLoading={isDeletingStaff}
              disabled={isDeletingStaff}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Delete
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── STAFF DETAILS POPUP MODAL (MINIMAL & SLEEK) ── */}
      <Modal
        isOpen={showStaffDetailsModal}
        onClose={() => setShowStaffDetailsModal(false)}
        title="Staff Details"
        size="md"
      >
        {selectedStaff && (
          <div className="space-y-6">
            {/* Header / Avatar Profile Block */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white shadow-xs">
                {formatStaffDisplayName(selectedStaff.name, selectedStaff.assignedBranchIds).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{formatStaffDisplayName(selectedStaff.name, selectedStaff.assignedBranchIds)}</h3>
                  {selectedStaff.status === 'PENDING_ACTIVATION' ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                      Pending Activation
                    </span>
                  ) : (
                    <Badge variant={selectedStaff.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {selectedStaff.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {getStaffRoleLabel(selectedStaff)}
                </p>
              </div>
            </div>

            {/* Information Grid */}
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between p-3.5 text-xs">
                <span className="text-slate-500 font-medium">Assigned Counter</span>
                <span className="font-semibold text-slate-900">
                  {branches
                    .filter((b) => selectedStaff.assignedBranchIds.includes(b.id))
                    .map((b) => b.name)
                    .join(', ') || 'All Counters'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 text-xs">
                <span className="text-slate-500 font-medium">Phone Number</span>
                <span className="font-mono font-medium text-slate-900">
                  {selectedStaff.phone || 'Not provided'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 text-xs">
                <span className="text-slate-500 font-medium">Role & Position</span>
                <span className="font-semibold text-slate-800">
                  {getStaffRoleLabel(selectedStaff)}
                </span>
              </div>
            </div>

            {/* Quick Action Footer */}
            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowStaffDetailsModal(false);
                  if (selectedCounterGroup) {
                    setShowCounterStaffModal(true);
                  }
                }}
                leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                className="text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Back
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* ── COUNTER STAFF LIST MODAL (EXPANDED & UNCLUTTERED UX) ── */}
      <Modal
        isOpen={showCounterStaffModal}
        onClose={() => {
          setShowCounterStaffModal(false);
          setModalCounterSearch('');
        }}
        title={selectedCounterGroup ? `${selectedCounterGroup.counterName} — Staff Details` : 'Staff Details'}
        size="2xl"
      >
        {selectedCounterGroup && (
          <div className="space-y-4">
            {/* Top Search Bar for Searching Counters and Filtering Staff */}
            <div className="space-y-2">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search counters (e.g. Main Cafeteria, Executive Lounge)..."
                  value={modalCounterSearch}
                  maxLength={35}
                  onChange={(e) => setModalCounterSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all shadow-xs"
                />
                {modalCounterSearch && (
                  <button
                    type="button"
                    onClick={() => setModalCounterSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-200/50"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {otherMatchingCounters.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap px-1 text-[11px] text-slate-500">
                  <span className="font-medium">Switch to counter:</span>
                  {otherMatchingCounters.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setSelectedCounterGroup(g);
                        setModalCounterSearch('');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium cursor-pointer transition-colors"
                    >
                      <Building2 className="h-3 w-3" />
                      <span>{g.counterName} ({g.staff.length})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCounterGroup.staff.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No staff accounts assigned to this counter</p>
                <p className="text-[11px] text-slate-500 mt-1">You can add staff members or assign existing staff to this counter.</p>
                {canManage && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowCounterStaffModal(false);
                      setModalCounterSearch('');
                      handleOpenAdd();
                    }}
                    leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                    className="mt-3 text-xs"
                  >
                    Add Staff Member
                  </Button>
                )}
              </div>
            ) : displayedModalStaff.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Search className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No staff accounts match "{modalCounterSearch}"</p>
                <button
                  type="button"
                  onClick={() => setModalCounterSearch('')}
                  className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                >
                  Clear search filter
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
                {displayedModalStaff.map((st) => (
                  <div
                    key={st.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20 transition-all gap-3.5"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                       <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm sm:text-base font-bold text-white shadow-2xs">
                         {formatStaffDisplayName(st.name, st.assignedBranchIds, selectedCounterGroup?.counterName).charAt(0).toUpperCase()}
                       </div>
                       <div className="min-w-0 flex-1">
                         <div className="flex items-center gap-2 flex-wrap">
                           <span className="font-bold text-slate-900 text-sm sm:text-base">{formatStaffDisplayName(st.name, st.assignedBranchIds)}</span>
                         </div>
                         <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                           <span className="font-medium text-slate-600">
                             {selectedCounterGroup ? getStaffRoleLabel(st) : getStaffRoleLabel(st)}
                           </span>
                           {st.phone && <span className="font-mono text-slate-500">• {st.phone}</span>}
                         </div>
                       </div>

                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap sm:flex-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCounterStaffModal(false);
                          handleOpenStaffDetails(st);
                        }}
                        className="text-xs h-7.5 px-2.5 font-medium border-slate-300 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer"
                      >
                        View Details
                      </Button>
                      {canManage && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setShowCounterStaffModal(false);
                            handleOpenStaffModal(st, 'overview');
                          }}
                          leftIcon={<Edit2 className="h-3 w-3" />}
                          className="text-xs h-7.5 px-2.5 font-medium cursor-pointer"
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCounterStaffModal(false);
                          handleOpenStaffAudit(st);
                        }}
                        leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
                        className="text-xs h-7.5 px-2.5 font-medium border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                      >
                        Performance & Audit
                      </Button>

                      {/* Active / Inactive Slide Switch */}
                      <div className="flex items-center gap-2 pl-2.5 border-l border-slate-200">
                        <span
                          className={`text-xs font-semibold select-none ${
                            st.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {st.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={st.status === 'ACTIVE'}
                          disabled={!canManage || togglingStaffId === st.id}
                          onClick={() => handleToggleStaffStatus(st)}
                          className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed ${
                            st.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                          title={
                            st.status === 'ACTIVE'
                              ? 'Click to slide Inactive'
                              : 'Click to slide Active'
                          }
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 mt-[3px] rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${
                              st.status === 'ACTIVE' ? 'translate-x-[21px]' : 'translate-x-[3px]'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ModalFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCounterStaffModal(false);
                  setModalCounterSearch('');
                }}
              >
                Close
              </Button>
              {canManage && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setShowCounterStaffModal(false);
                    setModalCounterSearch('');
                    handleOpenAdd();
                  }}
                >
                  Add Staff Member
                </Button>
              )}
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* ── 2. ADD STAFF MEMBER MODAL (TABBED STEPPER UX) ── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Staff Member"
        size="xl"
      >
        <div className="space-y-6">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          {/* Stepper for Org Admin (2 steps), or Counter Banner for Counter Admin */}
          {!isCounterView ? (
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setAddTab('basic')}
                className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    addTab === 'basic'
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  1
                </div>
                <div>
                  <p className={`text-xs font-bold ${addTab === 'basic' ? 'text-emerald-700' : 'text-slate-700'}`}>
                    1. Account Details
                  </p>
                  <p className="text-[10px] text-slate-400">Name & Phone</p>
                </div>
              </button>

              <div className="h-0.5 w-12 bg-slate-200 hidden sm:block" />

              <button
                type="button"
                onClick={() => {
                  if (validateBasicInfo()) setAddTab('branches');
                }}
                className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    addTab === 'branches'
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  2
                </div>
                <div>
                  <p className={`text-xs font-bold ${addTab === 'branches' ? 'text-emerald-700' : 'text-slate-700'}`}>
                    2. Assign Counters
                  </p>
                  <p className="text-[10px] text-slate-400">Counter Terminal</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 mb-4">
              <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Adding staff member for counter: <strong>{scopedBranches[0]?.name || 'Current Counter'}</strong>
              </span>
            </div>
          )}

          {/* Form Step Panes (Preserves entered state across tabs) */}
          <div className="max-h-[64vh] overflow-y-auto pr-1">
            {/* ── STEP 1: BASIC INFO ── */}
            {addTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="add-staff-name"
                    label="Staff Full Name *"
                    placeholder="e.g. John Cashier"
                    maxLength={50}
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    error={formErrors.name}
                    disabled={isSubmitting}
                    autoFocus
                  />

                  <Input
                    id="add-staff-phone"
                    label="Staff Phone Number *"
                    placeholder="10-digit mobile number, e.g. 9876543210"
                    maxLength={15}
                    value={formPhone}
                    onChange={(e) => {
                      setFormPhone(e.target.value);
                      if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    error={formErrors.phone}
                    disabled={isSubmitting}
                  />
                </div>

                <Input
                  id="add-staff-password"
                  type={showAddPassword ? 'text' : 'password'}
                  label="Login Password *"
                  placeholder="Min 4 characters"
                  maxLength={50}
                  value={formPassword}
                  onChange={(e) => {
                    setFormPassword(e.target.value);
                    if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  error={formErrors.password}
                  disabled={isSubmitting}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 flex items-center justify-center cursor-pointer"
                      title={showAddPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </div>
            )}

            {/* ── STEP 2: COUNTERS ── */}
            {addTab === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs text-slate-500">
                    {isCounterView
                      ? 'Staff member will be automatically assigned to your counter terminal.'
                      : 'Assign this staff member to one or more counters.'}
                  </p>
                  {!isCounterView && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormBranchIds(scopedBranches.map((b) => b.id))}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                      >
                        Select All ({scopedBranches.length})
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setFormBranchIds([])}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {scopedBranches.map((b) => {
                    const isAssigned = formBranchIds.includes(b.id);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => {
                          if (isCounterView) return;
                          if (isAssigned) {
                            setFormBranchIds(formBranchIds.filter((id) => id !== b.id));
                          } else {
                            setFormBranchIds([...formBranchIds, b.id]);
                          }
                        }}
                        role="checkbox"
                        aria-checked={isAssigned}
                        disabled={isCounterView}
                        className={`flex w-full ${isCounterView ? 'cursor-default' : 'cursor-pointer'} items-center justify-between rounded-xl border p-3.5 text-xs text-left transition-all select-none ${
                          isAssigned
                            ? 'border-emerald-500 bg-emerald-50 text-slate-900 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              isAssigned
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-slate-100'
                            }`}
                          >
                            {isAssigned && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-xs">{b.name}</p>
                              <span className="text-[10px] text-slate-400">Counter Terminal</span>
                            </div>
                          </div>
                        </div>

                        <Badge variant={b.status === 'ACTIVE' ? 'success' : 'outline'} className="text-[10px]">
                          {b.status}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>

            {addTab === 'basic' && isCounterView && (
              <Button
                type="button"
                variant="primary"
                onClick={() => handleAddSubmit()}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Create Staff Account
              </Button>
            )}

            {addTab === 'basic' && !isCounterView && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (validateBasicInfo()) setAddTab('branches');
                }}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Next: Assign Counters
              </Button>
            )}

            {addTab === 'branches' && !isCounterView && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddTab('basic')}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back: Account Details
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleAddSubmit()}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Create Staff Account
                </Button>
              </div>
            )}
          </ModalFooter>
        </div>
      </Modal>



      {/* ── WhatsApp & Staff Credentials Popup Modal (Opens right after creating staff member) ── */}
      <Modal
        isOpen={showStaffCreatedModal}
        onClose={() => setShowStaffCreatedModal(false)}
        title="Staff Account Created"
        size="md"
      >
        <div className="py-2 space-y-4">
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/60">
            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3 ring-8 ring-emerald-50">
              <Smartphone className="h-7 w-7" />
            </div>
            <Badge variant="success" className="mb-2">
              Ready for Mobile POS Login
            </Badge>
            <h3 className="text-lg font-bold text-slate-900">
              {createdStaffCredentials?.name}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Account activated immediately. Share these login credentials with the staff member to log in to the POS app.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Assigned Counter:</span>
              <span className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                {branches.filter((b) => createdStaffCredentials?.branchIds?.includes(b.id)).map((b) => b.name).join(', ') || 'Unassigned'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-slate-200/80 pt-2.5">
              <span className="text-slate-500 font-medium">Login Phone Number:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{createdStaffCredentials?.phone}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-slate-200/80 pt-2.5">
              <span className="text-slate-500 font-medium">POS Password:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">{createdStaffCredentials?.password}</span>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-blue-900">
              <Share2 className="h-4 w-4 text-blue-600" />
              Direct WhatsApp Dispatch
            </p>
            <p>
              Clicking below opens WhatsApp (Desktop or Mobile) directly to this staff member's phone number with their login credentials.
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!createdStaffCredentials) return;
                const assignedCounter = branches.filter((b) => createdStaffCredentials?.branchIds?.includes(b.id)).map((b) => b.name).join(', ') || 'Unassigned';
                const text = `Staff Login Credentials:\nName: ${createdStaffCredentials.name}\nCounter: ${assignedCounter}\nPhone: ${createdStaffCredentials.phone}\nPassword: ${createdStaffCredentials.password}`;
                navigator.clipboard.writeText(text);
                notify.success('Credentials copied to clipboard!');
              }}
              leftIcon={<Copy className="h-4 w-4 text-slate-600" />}
            >
              Copy Credentials
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!createdStaffCredentials) return;
                const cleanPhone = createdStaffCredentials.phone.replace(/\D/g, '');
                const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                const assignedCounter = branches.filter((b) => createdStaffCredentials?.branchIds?.includes(b.id)).map((b) => b.name).join(', ') || 'Unassigned';
                const message = `Hello ${createdStaffCredentials.name},\n\nYour staff account for Money Card POS has been created!\n\n• Assigned Counter: ${assignedCounter}\n• Login Phone: ${createdStaffCredentials.phone}\n• Password: ${createdStaffCredentials.password}\n\nPlease open the Money Card POS App on your phone and log in with your phone number and password.`;
                const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
                window.open(waUrl, '_blank');
              }}
              leftIcon={<ExternalLink className="h-4 w-4" />}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white border-none cursor-pointer"
            >
              Send via WhatsApp
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStaffCreatedModal(false)}
            >
              Done
            </Button>
          </ModalFooter>
        </div>
      </Modal>


      {/* ── 5. DAILY ACTIVITY SUMMARY MODAL ── */}
      {selectedStaffForAudit && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedStaffForAudit(null);
            setAuditActivityTypeFilter('ALL');
            setAuditSearch('');
            const today = getTodayDateStr();
            setAuditStartDate(today);
            setAuditEndDate(today);
            setAuditDatePreset('TODAY');
          }}
          title={`${formatStaffDisplayName(selectedStaffForAudit.name, selectedStaffForAudit.assignedBranchIds)} — Daily Activity Summary`}
          size="xl"
        >
          <div className="space-y-5 text-xs">
            {/* Staff Profile & Date Selector Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              {/* Staff Info (No Phone Number) */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {formatStaffDisplayName(selectedStaffForAudit.name, selectedStaffForAudit.assignedBranchIds).charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {formatStaffDisplayName(selectedStaffForAudit.name, selectedStaffForAudit.assignedBranchIds)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {getStaffRoleLabel(selectedStaffForAudit)}
                  </span>
                </div>
              </div>

              {/* Date Dropdown (No Export CSV) */}
              <div className="relative inline-flex items-center">
                <select
                  value={auditDatePreset}
                  onChange={(e) => handleDatePresetChange(e.target.value as any)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="THIS_WEEK">This Week</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="ALL_TIME">All Time</option>
                </select>
              </div>
            </div>

            {/* Minimal 5-Metric Strip (Zero Emojis) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Wallets Issued</p>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">
                  {auditMetrics.cardsActivatedCount}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Wallets Closed</p>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">
                  {auditMetrics.cardsSettledCount}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Money Loaded</p>
                <p className="text-lg font-bold font-mono text-emerald-600 mt-1">
                  {formatCurrency(auditMetrics.cardRechargeVolume)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Orders Sold</p>
                <p className="text-lg font-bold font-mono text-indigo-600 mt-1">
                  {formatCurrency(auditMetrics.purchaseVolume)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Money Refunded</p>
                <p className="text-lg font-bold font-mono text-rose-600 mt-1">
                  {formatCurrency(auditMetrics.refundVolume)}
                </p>
              </div>
            </div>

            {/* Streamlined Toolbar */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={auditActivityTypeFilter}
                  onChange={(e) => setAuditActivityTypeFilter(e.target.value as any)}
                  className="h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none"
                >
                  <option value="ALL">All Activities</option>
                  <option value="CARD_ACTIVATION">New Wallets Issued</option>
                  <option value="CARD_SETTLEMENT">Wallets Closed</option>
                  <option value="RECHARGE">Money Loaded</option>
                  <option value="PURCHASE">Orders Sold</option>
                  <option value="REFUND">Money Refunded</option>
                </select>
                <div className="relative flex-1 max-w-xs">
                  <div className="absolute left-2.5 top-2.5 text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by wallet or note..."
                    value={auditSearch}
                    maxLength={30}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s@._-]/g, '').slice(0, 30);
                      setAuditSearch(sanitized);
                    }}
                    className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-slate-400"
                  />
                  {auditSearch && (
                    <button
                      type="button"
                      onClick={() => setAuditSearch('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="Clear activity filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                {filteredAuditActivities.length} {filteredAuditActivities.length === 1 ? 'activity' : 'activities'}
              </span>
            </div>

            {/* Chronological Feed */}
            <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xs divide-y divide-slate-100">
              {filteredAuditActivities.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No activity records found matching selected criteria.
                </div>
              ) : (
                filteredAuditActivities.map((act) => {
                  const details = getActivityDetails(act);
                  return (
                    <div
                      key={act.id}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="w-24 shrink-0 font-mono text-xs font-semibold text-slate-700">
                        {details.timeStr}
                      </div>
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 px-2">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {details.title}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${details.badgeClass}`}>
                          {details.badgeLabel}
                        </span>
                      </div>
                      <div className={`text-right shrink-0 font-mono text-xs font-bold ${details.amountClass}`}>
                        {details.amountText}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <ModalFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStaffForAudit(null);
                  setAuditActivityTypeFilter('ALL');
                  setAuditSearch('');
                  const today = getTodayDateStr();
                  setAuditStartDate(today);
                  setAuditEndDate(today);
                  setAuditDatePreset('TODAY');
                }}
              >
                Close
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
}
