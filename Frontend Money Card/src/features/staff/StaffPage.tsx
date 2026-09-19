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
  Select,
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
import { PermissionMatrix } from './PermissionMatrix';
import { MANAGER_PERMISSIONS, STAFF_PERMISSIONS } from './constants';
import { UnauthorizedPage } from '@/features/auth';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Building2,
  ShieldCheck,
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
  Phone,
  CheckCircle2,
} from 'lucide-react';

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
  const canManage = hasPermission('STAFF_MANAGE');

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
  const [staffTab, setStaffTab] = useState<'overview' | 'permissions' | 'branches'>('overview');

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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);

  // ── Add Staff Modal State & Multi-step Tabs ─────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<'basic' | 'branches' | 'permissions'>('basic');

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
  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);

  // ── Staff Performance & Operational Audit State ───────────
  const [selectedStaffForAudit, setSelectedStaffForAudit] = useState<Staff | null>(null);
  const [staffPerformanceList, setStaffPerformanceList] = useState<StaffPerformanceMetric[]>([]);
  const [auditBranchFilter, setAuditBranchFilter] = useState<string>('ALL');
  const [auditDatePreset, setAuditDatePreset] = useState<string>('all');
  const [auditStartDate, setAuditStartDate] = useState<string>('');
  const [auditEndDate, setAuditEndDate] = useState<string>('');
  const [auditActivityTypeFilter, setAuditActivityTypeFilter] = useState<'ALL' | 'CARD_ACTIVATION' | 'RECHARGE' | 'PURCHASE' | 'CARD_SETTLEMENT' | 'OTHER'>('ALL');
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

    const unassigned = filteredStaff.filter(
      (s) =>
        !s.assignedBranchIds ||
        !s.assignedBranchIds.length ||
        !s.assignedBranchIds.some((bId) => branches.some((b) => b.id === bId)),
    );
    if (unassigned.length > 0 && (staffBranchFilter === 'ALL' || !isCounterView)) {
      groups.push({
        id: 'unassigned-all',
        counterName: 'All Counters / General Staff',
        staff: unassigned,
      });
    }

    return groups;
  }, [branches, scopedBranches, filteredStaff, staffList, isCounterView, staffBranchFilter, searchQuery, statusFilter]);

  // If user lacks STAFF_VIEW permission, block access
  if (!canView) {
    return <UnauthorizedPage />;
  }

  // ── Open Add Staff Modal ──────────────────────────────────
  const handleOpenAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setShowAddPassword(false);
    const defaultBranchIds = isCounterView
      ? scopedBranches.map((b) => b.id)
      : branches.map((b) => b.id);
    setFormBranchIds(defaultBranchIds);
    setFormPermissions([...STAFF_PERMISSIONS]);
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

    const cleanPhone = formPhone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'Phone number is required';
    } else if (cleanPhone.length < 10 || cleanPhone.length > 15) {
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
      const finalPermissions = new Set(formPermissions);
      if (finalPermissions.has('CARD_BLOCK') || finalPermissions.has('CARD_UNBLOCK')) {
        finalPermissions.add('CARD_BLOCK');
        finalPermissions.add('CARD_UNBLOCK');
      }
      if (finalPermissions.has('PRODUCT_VIEW')) {
        finalPermissions.add('PRODUCT_VIEW');
      }
      if (finalPermissions.has('PRODUCT_MANAGE')) {
        finalPermissions.add('PRODUCT_MANAGE');
        finalPermissions.add('PRODUCT_VIEW');
      }
      if (finalPermissions.has('BRANCH_VIEW') || finalPermissions.has('STAFF_VIEW')) {
        finalPermissions.add('BRANCH_VIEW');
        finalPermissions.add('STAFF_VIEW');
      }
      if (
        finalPermissions.has('BRANCH_MANAGE') ||
        finalPermissions.has('STAFF_MANAGE') ||
        finalPermissions.has('VIEW_ANALYTICS') ||
        finalPermissions.has('VIEW_REPORTS')
      ) {
        finalPermissions.add('BRANCH_MANAGE');
        finalPermissions.add('STAFF_MANAGE');
        finalPermissions.add('VIEW_ANALYTICS');
        finalPermissions.add('VIEW_REPORTS');
        finalPermissions.add('BRANCH_VIEW');
        finalPermissions.add('STAFF_VIEW');
      }

      const res = await apiService.staff.createStaff({
        name: formName.trim(),
        phone: formPhone.trim().replace(/\D/g, ''),
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
      setCreatedStaffCredentials({
        name: res.data.name,
        phone: formPhone.trim().replace(/\D/g, ''),
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
    initialTab: 'overview' | 'permissions' | 'branches' = 'overview',
  ) => {
    setSelectedStaff(staff);
    setFormName(staff.name);
    setFormPhone(staff.phone || '');
    setFormEmail(staff.email || '');
    setFormBranchIds(staff.assignedBranchIds);
    setFormPermissions(staff.permissions);
    setStaffTab(initialTab);
    setFormErrors({});
    setModalApiError(null);
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
    const pwdText = formNewPassword.trim() || '[Your Existing Password]';
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

    const pwdText = formNewPassword.trim() || '[Your Existing Password]';
    const assignedBranchesText =
      branches
        .filter((b) => formBranchIds.includes(b.id))
        .map((b) => b.name)
        .join(', ') || 'All Counters';
    const loginUrl = `${window.location.origin}/login`;

    const message =
      `🍽️ *Money Card Staff Credentials*\n\n` +
      `Hello ${formName.trim() || selectedStaff.name},\n\n` +
      `Here are your updated staff login credentials:\n\n` +
      `• *Counter:* ${assignedBranchesText}\n` +
      `• *Mobile Number:* ${cleanPhone}\n` +
      `• *Password:* ${pwdText}\n\n` +
      `🌐 *POS Login Link:* ${loginUrl}\n\n` +
      `_Log in using your Mobile Number and Password to access your counter POS._`;

    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
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

    const cleanPhone = formPhone.trim().replace(/\D/g, '');
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

  //  Save Staff Permissions
  const handleSavePermissions = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStaff) return;

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const permissionsToSave = new Set(formPermissions);
      if (permissionsToSave.has('CARD_BLOCK') || permissionsToSave.has('CARD_UNBLOCK')) {
        permissionsToSave.add('CARD_BLOCK');
        permissionsToSave.add('CARD_UNBLOCK');
      }
      if (permissionsToSave.has('PRODUCT_VIEW')) {
        permissionsToSave.add('PRODUCT_VIEW');
      }
      if (permissionsToSave.has('PRODUCT_MANAGE')) {
        permissionsToSave.add('PRODUCT_MANAGE');
        permissionsToSave.add('PRODUCT_VIEW');
      }
      if (permissionsToSave.has('BRANCH_VIEW') || permissionsToSave.has('STAFF_VIEW')) {
        permissionsToSave.add('BRANCH_VIEW');
        permissionsToSave.add('STAFF_VIEW');
      }
      if (
        permissionsToSave.has('BRANCH_MANAGE') ||
        permissionsToSave.has('STAFF_MANAGE') ||
        permissionsToSave.has('VIEW_ANALYTICS') ||
        permissionsToSave.has('VIEW_REPORTS')
      ) {
        permissionsToSave.add('BRANCH_MANAGE');
        permissionsToSave.add('STAFF_MANAGE');
        permissionsToSave.add('VIEW_ANALYTICS');
        permissionsToSave.add('VIEW_REPORTS');
        permissionsToSave.add('BRANCH_VIEW');
        permissionsToSave.add('STAFF_VIEW');
      }

      const res = await apiService.staff.updateStaffPermissions(
        selectedStaff.id,
        Array.from(permissionsToSave),
      );

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update permissions');
        return;
      }

      notify.success('Permissions updated successfully.');
      setSelectedStaff((prev) => (prev ? { ...prev, permissions: Array.from(permissionsToSave) } : null));
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
        phone: formPhone.trim().replace(/\D/g, '') || undefined,
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
  const getStaffRoleLabel = (staff: Staff): string => {
    if (staff.permissions.includes('RECHARGE') || staff.permissions.includes('STAFF_MANAGE')) {
      return 'Manager';
    }
    return 'Staff';
  };

  const getAuditPresetDates = (preset: string): { startDate: string; endDate: string } => {
    const now = new Date();
    const endStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      return { startDate: endStr, endDate: endStr };
    }
    if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      return { startDate: yestStr, endDate: yestStr };
    }
    if (preset === 'last7') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString().split('T')[0], endDate: endStr };
    }
    if (preset === 'last30') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString().split('T')[0], endDate: endStr };
    }
    if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.toISOString().split('T')[0], endDate: endStr };
    }

    return { startDate: '', endDate: '' };
  };

  const handleOpenStaffAudit = async (staff: Staff) => {
    setSelectedStaffForAudit(staff);
    setAuditBranchFilter('ALL');
    setAuditDatePreset('all');
    setAuditStartDate('');
    setAuditEndDate('');
    setAuditActivityTypeFilter('ALL');
    setAuditSearch('');

    if (staffPerformanceList.length === 0) {
      try {
        const res = await apiService.analytics.getOverview();
        if (res.success && res.data.staffPerformance) {
          setStaffPerformanceList(res.data.staffPerformance);
        }
      } catch {
        // Ignored
      }
    }
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

  const targetBranchName = useMemo(() => {
    if (auditBranchFilter === 'ALL') return undefined;
    return branches.find((b) => b.id === auditBranchFilter)?.name;
  }, [auditBranchFilter, branches]);

  const scopedAuditActivities = useMemo(() => {
    if (!targetStaffMetric?.activities) return [];
    return filterStaffActivities({
      activities: targetStaffMetric.activities,
      branchFilter: auditBranchFilter,
      branchName: targetBranchName,
      startDate: auditStartDate,
      endDate: auditEndDate,
    });
  }, [targetStaffMetric, auditBranchFilter, targetBranchName, auditStartDate, auditEndDate]);

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

  const handleExportAuditCsv = () => {
    if (!selectedStaffForAudit) return;
    const headers = [
      'Timestamp',
      'Type',
      'Card Number',
      'Customer Name',
      'Customer Phone',
      'Amount (INR)',
      'Branch',
      'Details/Remarks',
    ];

    const exportList = filteredAuditActivities.length > 0 ? filteredAuditActivities : scopedAuditActivities;
    const rows = exportList.map((act) => [
      act.timestamp ? `"${new Date(act.timestamp).toLocaleString()}"` : '"N/A"',
      `"${act.type}"`,
      act.cardNumber ? `="${act.cardNumber}"` : '"N/A"',
      `"${(act.customerName || 'Walk-in Customer').replace(/"/g, '""')}"`,
      act.customerPhone ? `="${act.customerPhone}"` : '"N/A"',
      act.amount !== undefined ? act.amount.toFixed(2) : '0.00',
      `"${(act.branchName || 'Main Cafeteria').replace(/"/g, '""')}"`,
      `"${(act.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedStaff = selectedStaffForAudit.name.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `StaffActivity_${sanitizedStaff}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify.success(`Activity log for ${selectedStaffForAudit.name} exported as CSV.`);
  };

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

  // ── Table Columns (Counter-First & Minimal) ────────────────
  const columns = [
    {
      key: 'counterName',
      header: 'Counter Name',
      render: (group: CounterStaffGroup) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">{group.counterName}</span>
        </div>
      ),
    },
    {
      key: 'staffDetails',
      header: 'Staff Details',
      className: 'text-right',
      render: (group: CounterStaffGroup) => (
        <div className="flex justify-end">
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

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* ─── Minimal Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
            {isCounterView && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 text-xs">
                Counter Scope
              </Badge>
            )}
          </div>
          {isCounterView && (
            <p className="text-xs text-slate-500 mt-0.5">
              Showing staff at your counter only. New staff are automatically assigned to your counter.
            </p>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              leftIcon={<UserPlus className="h-3.5 w-3.5" />}
              className="text-xs h-8 px-3.5 font-semibold"
            >
              Add Staff Member
            </Button>
          </div>
        )}
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
            placeholder="Search counters or staff by name, phone..."
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
              <Button variant="primary" onClick={handleOpenAdd} leftIcon={<UserPlus className="h-4 w-4" />}>
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
          <DataTable<CounterStaffGroup>
            data={counterStaffGroups}
            columns={columns}
            keyExtractor={(item: CounterStaffGroup) => item.id}
          />
        </div>
      )}

      {/* ── 1. UNIFIED STAFF DETAILS & EDIT MODAL (WITH HORIZONTAL TABS) ── */}
      <Modal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        title={canManage ? `Staff Settings: ${selectedStaff?.name}` : `Staff Details: ${selectedStaff?.name}`}
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
              onClick={() => setStaffTab('permissions')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                staffTab === 'permissions'
                  ? 'border-emerald-600 text-emerald-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Permissions</span>
              <Badge variant="outline" className="text-[10px] ml-1">
                {formPermissions.length} / 20
              </Badge>
            </button>

            {!isCounterView && (
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
            )}
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

            {/* ── TAB 2: PERMISSIONS ── */}
            {staffTab === 'permissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-end pb-2">
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormPermissions([...MANAGER_PERMISSIONS])}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Manager (Recharge)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPermissions([...STAFF_PERMISSIONS])}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Staff (Deduct)
                      </button>
                    </div>
                  )}
                </div>

                <PermissionMatrix
                  selectedPermissions={formPermissions}
                  onChange={(perms) => setFormPermissions(perms)}
                  readOnly={!canManage}
                />
              </div>
            )}

            {/* ── TAB 3: COUNTERS ── */}
            {!isCounterView && staffTab === 'branches' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Cafeteria Counter Assignments
                  </h4>
                  <p className="text-xs text-slate-500">
                    Assign which cafeteria counters this staff member is authorized to access and operate.
                  </p>
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
                            <p className="text-[10px] text-slate-400">ID: {branch.id.slice(0, 8)}</p>
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

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowStaffModal(false)} disabled={isSubmitting}>
              Close
            </Button>
            {canManage && staffTab === 'overview' && (
              <Button type="button" variant="primary" onClick={handleSaveProfile} isLoading={isSubmitting} disabled={isSubmitting}>
                Save Staff Information
              </Button>
            )}
            {canManage && staffTab === 'permissions' && (
              <Button type="button" variant="primary" onClick={handleSavePermissions} isLoading={isSubmitting} disabled={isSubmitting} leftIcon={<ShieldCheck className="h-4 w-4" />}>
                Save Permissions
              </Button>
            )}
            {canManage && !isCounterView && staffTab === 'branches' && (
              <Button type="button" variant="primary" onClick={handleSaveBranches} isLoading={isSubmitting} disabled={isSubmitting} leftIcon={<Building2 className="h-4 w-4" />}>
                Save Branches
              </Button>
            )}
          </ModalFooter>
        </form>
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
                {selectedStaff.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{selectedStaff.name}</h3>
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
              {selectedCounterGroup && selectedCounterGroup.staff.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowStaffDetailsModal(false);
                    setShowCounterStaffModal(true);
                  }}
                  leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                  className="mr-auto text-xs"
                >
                  Back to {selectedCounterGroup.counterName}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStaffDetailsModal(false)}
              >
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowStaffDetailsModal(false);
                  handleOpenStaffAudit(selectedStaff);
                }}
                leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
                className="text-xs font-medium border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
              >
                Performance & Audit
              </Button>
              {canManage && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Edit2 className="h-4 w-4" />}
                  onClick={() => {
                    setShowStaffDetailsModal(false);
                    handleOpenStaffModal(selectedStaff, 'overview');
                  }}
                >
                  Edit Staff
                </Button>
              )}
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
                        {st.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm sm:text-base">{st.name}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                          <span className="font-medium text-slate-600">
                            {getStaffRoleLabel(st)}
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

          {/* 3-Step Guided Wizard Stepper */}
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

            <div className="h-0.5 w-8 bg-slate-200 hidden sm:block" />

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
                    : addTab === 'permissions'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                2
              </div>
              <div>
                <p className={`text-xs font-bold ${addTab === 'branches' ? 'text-emerald-700' : 'text-slate-700'}`}>
                  2. Role & Counter
                </p>
                <p className="text-[10px] text-slate-400">Counter & preset</p>
              </div>
            </button>

            <div className="h-0.5 w-8 bg-slate-200 hidden sm:block" />

            <button
              type="button"
              onClick={() => {
                if (validateBasicInfo()) setAddTab('permissions');
              }}
              className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  addTab === 'permissions'
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                3
              </div>
              <div>
                <p className={`text-xs font-bold ${addTab === 'permissions' ? 'text-emerald-700' : 'text-slate-700'}`}>
                  3. Review & Create
                </p>
                <p className="text-[10px] text-slate-400">Summary & activate</p>
              </div>
            </button>
          </div>

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

                {/* Role Preset Selection inside Step 2 */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Choose a Staff Role Preset
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pick what this staff member will do in your organization.
                    </p>
                  </div>

                  {/* 2 Large Role Preset Cards: Manager & Staff */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Manager: Recharge Cards */}
                    <button
                      type="button"
                      onClick={() => setFormPermissions([...MANAGER_PERMISSIONS])}
                      className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer select-none ${
                        formPermissions.includes('RECHARGE')
                          ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Recharge Cards
                          </span>
                          {formPermissions.includes('RECHARGE') && (
                            <Check className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-slate-900">Manager</h5>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Full counter management, card issuing/settlement, balance recharge, and reports.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-600 font-semibold mt-3">
                        Recharge & Full Management
                      </span>
                    </button>

                    {/* Staff: Deduct Amount */}
                    <button
                      type="button"
                      onClick={() => setFormPermissions([...STAFF_PERMISSIONS])}
                      className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer select-none ${
                        !formPermissions.includes('RECHARGE')
                          ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Deduct Amount
                          </span>
                          {!formPermissions.includes('RECHARGE') && (
                            <Check className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-slate-900">Staff</h5>
                        <p className="text-[11px] text-slate-500 mt-1">
                          POS billing, menu item selection, balance deduction, and customer order handling.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 font-semibold mt-3">
                        Deduct Only (No Recharge)
                      </span>
                    </button>
                  </div>

                  {/* Collapsible Advanced Permissions Toggle */}
                  <div className="pt-3 border-t border-slate-200 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      <span>{showAdvancedPerms ? '▼ Hide individual permissions' : '▶ Customize individual permissions (optional)'}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {formPermissions.length} selected
                      </Badge>
                    </button>

                    {showAdvancedPerms && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <PermissionMatrix
                          selectedPermissions={formPermissions}
                          onChange={setFormPermissions}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: REVIEW & CREATE ── */}
            {addTab === 'permissions' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{formName || 'Staff Member'}</h4>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {formPhone || 'No phone entered'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-500 font-medium block mb-1">Assigned Counter(s)</span>
                      <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {formBranchIds.length === 0
                          ? 'No counters selected'
                          : branches
                              .filter((b) => formBranchIds.includes(b.id))
                              .map((b) => b.name)
                              .join(', ')}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-500 font-medium block mb-1">Assigned Role Preset</span>
                      <p className="font-semibold text-emerald-700">
                        {formPermissions.length === 8 && formPermissions.includes('PURCHASE') && !formPermissions.includes('PRODUCT_MANAGE')
                          ? 'Cashier / POS (8 permissions)'
                          : formPermissions.length === 16
                          ? 'Supervisor (16 permissions)'
                          : formPermissions.length === 20
                          ? 'Manager / Admin (All 20 permissions)'
                          : `Custom Role (${formPermissions.length} permissions)`}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Ready for immediate mobile activation</p>
                      <p className="text-emerald-700 mt-0.5">
                        The staff account will be activated immediately upon creation. The staff member can sign into the mobile POS app using phone number <strong>{formPhone}</strong> and their password.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>

            {addTab === 'basic' && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (validateBasicInfo()) setAddTab('branches');
                }}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Next: Role & Counter
              </Button>
            )}

            {addTab === 'branches' && (
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
                  onClick={() => setAddTab('permissions')}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Next: Review & Create
                </Button>
              </div>
            )}

            {addTab === 'permissions' && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddTab('branches')}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back: Role & Counter
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


      {/* ── 5. STAFF PERFORMANCE & OPERATIONAL AUDIT MODAL ── */}
      {selectedStaffForAudit && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedStaffForAudit(null);
            setAuditActivityTypeFilter('ALL');
            setAuditSearch('');
          }}
          title={`${selectedStaffForAudit.name} — Staff Performance & Operational Audit`}
          size="xl"
        >
          <div className="space-y-4 text-xs">
            {/* Staff Profile & Lifetime KPI Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-base">
                  {selectedStaffForAudit.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{selectedStaffForAudit.name}</span>
                    <Badge variant="outline" className="text-[10px] text-slate-600 bg-white">
                      {getStaffRoleLabel(selectedStaffForAudit)}
                    </Badge>
                  </div>
                  <span className="text-slate-500">
                    {selectedStaffForAudit.email} •{' '}
                    {branches
                      .filter((b) => selectedStaffForAudit.assignedBranchIds.includes(b.id))
                      .map((b) => b.name)
                      .join(', ') || 'All Counters'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAuditCsv}
                  leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
                >
                  Export Activity CSV
                </Button>
              </div>
            </div>

            {/* Interactive Filter Toolbar (Branch Scope & Time Window) */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Branch Scope */}
                <div className="w-44">
                  <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Counter Scope</label>
                  <Select
                    id="audit-branch-filter"
                    value={auditBranchFilter}
                    onChange={(e) => setAuditBranchFilter(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'All Counters' },
                      ...branches.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                  />
                </div>

                {/* Time Window */}
                <div className="w-40">
                  <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Time Window</label>
                  <Select
                    id="audit-date-preset"
                    value={auditDatePreset}
                    onChange={(e) => {
                      const preset = e.target.value;
                      setAuditDatePreset(preset);
                      const dates = getAuditPresetDates(preset);
                      setAuditStartDate(dates.startDate);
                      setAuditEndDate(dates.endDate);
                    }}
                    options={[
                      { value: 'all', label: 'All Time' },
                      { value: 'today', label: 'Today' },
                      { value: 'yesterday', label: 'Yesterday' },
                      { value: 'last7', label: 'Last 7 Days' },
                      { value: 'last30', label: 'Last 30 Days' },
                      { value: 'thisMonth', label: 'This Month' },
                      { value: 'custom', label: 'Custom Range' },
                    ]}
                  />
                </div>

                {auditDatePreset === 'custom' && (
                  <div className="flex items-center gap-2 pt-3">
                    <input
                      type="date"
                      value={auditStartDate}
                      onChange={(e) => setAuditStartDate(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="date"
                      value={auditEndDate}
                      onChange={(e) => setAuditEndDate(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800"
                    />
                  </div>
                )}
              </div>

              <span className="text-[11px] text-slate-500 font-medium">
                Showing <strong className="text-slate-900 font-mono">{filteredAuditActivities.length}</strong> activities
              </span>
            </div>

            {/* 5 Metric KPI Cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5">
                <span className="text-slate-500 text-[11px]">Cards Activated</span>
                <p className="font-mono text-base font-bold text-emerald-700">
                  {auditMetrics.cardsActivatedCount} cards
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 text-[11px]">Cards Settled</span>
                <p className="font-mono text-base font-bold text-slate-800">
                  {auditMetrics.cardsSettledCount} cards
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 text-[11px]">Card Recharges (POS)</span>
                <p className="font-mono text-base font-semibold text-emerald-600">
                  {formatCurrency(auditMetrics.cardRechargeVolume)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 text-[11px]">POS Sales Billed</span>
                <p className="font-mono text-base font-semibold text-emerald-600">
                  {formatCurrency(auditMetrics.purchaseVolume)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-slate-500 text-[11px]">Refunds Processed</span>
                <p className="font-mono text-base font-semibold text-rose-600">
                  {formatCurrency(auditMetrics.refundVolume)}
                </p>
              </div>
            </div>

            {/* Filter Tabs & Search in Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { key: 'ALL', label: 'All Activities' },
                  { key: 'CARD_ACTIVATION', label: 'Card Activations' },
                  { key: 'RECHARGE', label: 'Recharges' },
                  { key: 'PURCHASE', label: 'POS Sales' },
                  { key: 'CARD_SETTLEMENT', label: 'Settlements' },
                  { key: 'OTHER', label: 'Card Actions' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAuditActivityTypeFilter(tab.key as any)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      auditActivityTypeFilter === tab.key
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by card, customer, phone..."
                  value={auditSearch}
                  maxLength={30}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s@._-]/g, '').slice(0, 30);
                    setAuditSearch(sanitized);
                  }}
                  className="h-7.5 w-60 rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
                {auditSearch && (
                  <button
                    type="button"
                    onClick={() => setAuditSearch('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Clear activity filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Operational Activity Ledger Table */}
            <div className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 pl-3 pr-2">Date & Time</th>
                    <th className="px-2 py-2.5">Operation</th>
                    <th className="px-2 py-2.5">Card #</th>
                    <th className="px-2 py-2.5">Customer</th>
                    <th className="px-2 py-2.5 text-right">Amount</th>
                    <th className="px-2 py-2.5">Counter</th>
                    <th className="py-2.5 pl-2 pr-3">Details / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                  {filteredAuditActivities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                        No activity records found for this staff member matching selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditActivities.map((act: StaffActivityItem) => {
                      let badgeClass = 'bg-slate-100 text-slate-700';

                      if (act.type === 'CARD_ACTIVATION') {
                        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      } else if (act.type === 'RECHARGE_CASH') {
                        badgeClass = 'bg-green-100 text-green-800 border-green-200';
                      } else if (act.type === 'RECHARGE_UPI') {
                        badgeClass = 'bg-sky-100 text-sky-800 border-sky-200';
                      } else if (act.type === 'PURCHASE') {
                        badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                      } else if (act.type === 'CARD_SETTLEMENT') {
                        badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
                      } else if (act.type === 'REFUND' || act.type === 'CARD_BLOCKED') {
                        badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
                      }

                      return (
                        <tr key={act.id} className="hover:bg-slate-50/80">
                          <td className="py-2 pl-3 pr-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {act.timestamp ? new Date(act.timestamp).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${badgeClass}`}>
                              {act.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-2 py-2 font-mono font-semibold text-slate-800">
                            {act.cardNumber || '—'}
                          </td>
                          <td className="px-2 py-2">
                            <span className="font-medium text-slate-900">{act.customerName || 'Walk-in Customer'}</span>
                            {act.customerPhone && (
                              <span className="block text-[10px] text-slate-400 font-mono">{act.customerPhone}</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-bold text-slate-900">
                            {act.amount !== undefined ? formatCurrency(act.amount) : '—'}
                          </td>
                          <td className="px-2 py-2 text-slate-600">
                            {act.branchName || 'Main Cafeteria'}
                          </td>
                          <td className="py-2 pl-2 pr-3 text-slate-500 truncate max-w-[200px]" title={act.description}>
                            {act.description || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <ModalFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStaffForAudit(null);
                  setAuditActivityTypeFilter('ALL');
                  setAuditSearch('');
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
