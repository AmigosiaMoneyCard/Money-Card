// ─── Staff Management Page (M6) ───────────────────────────
// Unified Staff Details, Permissions, Branches, and Add Staff UX for ORG_ADMIN.
// Uses apiService abstraction strictly — does NOT call mock handlers directly.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '@/services/api';
import { usePermissions, useBranch } from '@/hooks';
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
  Card,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatDate, formatCurrency } from '@/utils';
import { filterStaffActivities, calculateScopedStaffMetrics } from '@/features/analytics/staffActivityFilter';
import { PermissionMatrix } from './PermissionMatrix';
import { UnauthorizedPage } from '@/features/auth';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Power,
  Building2,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Eye, EyeOff,
  Check,
  ArrowRight,
  ArrowLeft,
  User,
  Trash2,
  Lock,
  Key,
  X,
  MoreVertical,
  ChevronDown,
  FileSpreadsheet,
  Smartphone,
  Copy,
  ExternalLink,
  Share2,
  Phone,
  CheckCircle2,
} from 'lucide-react';

interface StaffActionMenuProps {
  staff: Staff;
  canManage: boolean;
  onEditOrView: () => void;
  onViewAudit?: () => void;
  onPermissions: () => void;
  onBranches: () => void;
  onSecurity: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function StaffActionMenu({
  staff,
  canManage,
  onEditOrView,
  onViewAudit,
  onPermissions,
  onBranches,
  onSecurity,
  onToggleStatus,
  onDelete,
}: StaffActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const menuWidth = 210;
    const menuHeight = 250;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = openUpwards ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.max(8, rect.right - menuWidth);

    setMenuPosition({ top, left });
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="inline-block text-left">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs py-1 px-2.5 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 shadow-xs"
      >
        <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
        <span>Actions</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 9999,
            }}
            className="w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Performance & Operational Audit */}
            {onViewAudit && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onViewAudit();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer text-left"
              >
                <Eye className="h-4 w-4 text-emerald-600" />
                <span>Performance & Audit</span>
              </button>
            )}

            {/* Profile / Details */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEditOrView();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
            >
              {canManage ? <Edit2 className="h-4 w-4 text-emerald-600" /> : <Eye className="h-4 w-4 text-emerald-600" />}
              <span>{canManage ? 'Edit / Details' : 'View Details'}</span>
            </button>

            {/* Manage / View Permissions */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onPermissions();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
            >
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              <span>{canManage ? 'Permissions' : 'View Permissions'}</span>
            </button>

            {/* Branch Assignments */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onBranches();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
            >
              <Building2 className="h-4 w-4 text-sky-600" />
              <span>Counter Access</span>
            </button>

            {/* Change Password */}
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSecurity();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
              >
                <Key className="h-4 w-4 text-amber-500" />
                <span>Change Password</span>
              </button>
            )}

            {canManage && <div className="my-1 border-t border-slate-200" />}

            {/* Status Toggle */}
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onToggleStatus();
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                  staff.status === 'ACTIVE'
                    ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                    : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                }`}
              >
                <Power className="h-4 w-4" />
                <span>{staff.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
              </button>
            )}

            {/* Delete Staff */}
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer text-left"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Staff</span>
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function StaffPage() {
  const { hasPermission } = usePermissions();
  const { currentBranch } = useBranch();

  const canView = hasPermission('STAFF_VIEW');
  const canManage = hasPermission('STAFF_MANAGE');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orgOverview, setOrgOverview] = useState<OrganizationOverview | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Unified Staff Details/Edit Modal State ─────────────────
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffTab, setStaffTab] = useState<'overview' | 'permissions' | 'branches' | 'security'>('overview');

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

  // ── Status Toggle Modal ───────────────────────────────────
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteStaffModal, setShowDeleteStaffModal] = useState(false);
  const [showStaffCreatedModal, setShowStaffCreatedModal] = useState(false);
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState<{
    name: string;
    phone: string;
    password: string;
  } | null>(null);

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
    if (currentBranch && currentBranch.id && currentBranch.id !== 'ALL') {
      result = result.filter(
        (s) => Array.isArray(s.assignedBranchIds) && s.assignedBranchIds.includes(currentBranch.id),
      );
    }
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();
    return result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)),
    );
  }, [staffList, currentBranch, searchQuery]);

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
    setFormBranchIds(branches.map((b) => b.id)); // Default assign all active branches
    setFormPermissions([
      'CARD_VIEW',
      'CARD_ISSUE',
      'CARD_RETURN',
      'RECHARGE',
      'PURCHASE',
      'SESSION_VIEW',
    ]);
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
    } else if (formPassword.trim().length < 6) {
      errors.password = 'Password must be at least 6 characters';
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
    initialTab: 'overview' | 'permissions' | 'branches' | 'security' = 'overview',
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
    if (formNewPassword.length < 8) return 'Password must be at least 8 characters long';
    if (formNewPassword.length > 128) return 'Password cannot exceed 128 characters';
    if (!/[A-Z]/.test(formNewPassword)) return 'Password must contain at least one uppercase letter [A-Z]';
    if (!/[a-z]/.test(formNewPassword)) return 'Password must contain at least one lowercase letter [a-z]';
    if (!/[0-9]/.test(formNewPassword)) return 'Password must contain at least one number [0-9]';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(formNewPassword)) {
      return 'Password must contain at least one special character (!@#$%^&*...)';
    }
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

  // ── Save Unified Staff Details & Permissions & Branches ───
  //  Save Staff Profile Information
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update staff profile');
        return;
      }

      notify.success('Staff profile updated successfully.');
      setSelectedStaff((prev) =>
        prev
          ? {
              ...prev,
              name: formName.trim(),
              phone: formPhone.trim().replace(/\D/g, '') || prev.phone,
              email: formEmail.trim() || prev.email,
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

  // ── Toggle Status Modal ───────────────────────────────────
  const handleOpenStatus = (staff: Staff) => {
    setSelectedStaff(staff);
    setModalApiError(null);
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async () => {
    if (!selectedStaff) return;
    if (selectedStaff.status === 'PENDING_ACTIVATION') {
      setModalApiError('This staff account is pending email activation. Please ask the staff member to activate via the email link, or click Resend Invite.');
      return;
    }
    const newStatus = selectedStaff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.staff.updateStaff(selectedStaff.id, { status: newStatus });
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to change staff status');
        return;
      }

      notify.success(
        `Staff member ${selectedStaff.name} is now ${newStatus === 'ACTIVE' ? 'Active' : 'Inactive'}`,
      );
      setShowStatusModal(false);
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete / Deactivate Staff ──────────────────────────────
  const handleOpenDeleteStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setModalApiError(null);
    setShowDeleteStaffModal(true);
  };

  const handleDeleteStaffSubmit = async () => {
    if (!selectedStaff) return;
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.staff.deleteStaff(selectedStaff.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to delete staff member');
        return;
      }

      notify.success(
        res.data?.deactivated
          ? 'Staff member deactivated to preserve historical transaction records'
          : 'Staff member deleted successfully',
      );
      setShowDeleteStaffModal(false);
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Staff Performance & Operational Audit Helpers ────────
  const getStaffRoleLabel = (staff: Staff): string => {
    if (staff.permissions.includes('STAFF_MANAGE')) return 'Manager / Admin';
    if (staff.permissions.includes('INVENTORY_MANAGE') || staff.permissions.includes('PRODUCT_MANAGE')) {
      return 'Counter Supervisor';
    }
    return 'Cashier / POS';
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

  // ── Table Columns ─────────────────────────────────────────
  const columns = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (staff: Staff) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-200">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">{staff.name}</p>
              <button
                type="button"
                onClick={() => handleOpenStaffAudit(staff)}
                className="p-1 rounded-md border text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
                title="View staff performance & operational audit"
                aria-label={`View performance for ${staff.name}`}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              {staff.phone && <span className="font-mono text-slate-700 font-medium">📱 {staff.phone}</span>}
              {staff.phone && staff.email && <span>•</span>}
              {staff.email && <span className="text-slate-400 truncate">{staff.email}</span>}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (staff: Staff) => (
        staff.status === 'PENDING_ACTIVATION' ? (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
            Pending Activation
          </span>
        ) : (
          <Badge variant={staff.status === 'ACTIVE' ? 'success' : 'danger'}>
            {staff.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Badge>
        )
      ),
    },
    {
      key: 'branches',
      header: 'Assigned Cafeterias',
      render: (staff: Staff) => {
        const assignedNames = branches
          .filter((b) => staff.assignedBranchIds.includes(b.id))
          .map((b) => b.name);

        return (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">
              {staff.assignedBranchIds.length} cafeteria(s)
            </span>
            {assignedNames.length > 0 && (
              <p className="max-w-[180px] truncate text-[11px] text-slate-500">
                {assignedNames.join(', ')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'permissions',
      header: 'Role & Access',
      render: (staff: Staff) => {
        const isManager = staff.permissions.includes('STAFF_MANAGE');
        const roleLabel = isManager ? 'Manager / Admin' : 'Cashier / POS';
        return (
          <span className="font-semibold text-xs text-slate-700">{roleLabel}</span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (staff: Staff) => (
        <span className="text-xs text-slate-500">{formatDate(staff.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (staff: Staff) => (
        <div className="flex items-center justify-end">
          <StaffActionMenu
            staff={staff}
            canManage={canManage}
            onEditOrView={() => handleOpenStaffModal(staff, 'overview')}
            onViewAudit={() => handleOpenStaffAudit(staff)}
            onPermissions={() => handleOpenStaffModal(staff, 'permissions')}
            onBranches={() => handleOpenStaffModal(staff, 'branches')}
            onSecurity={() => handleOpenStaffModal(staff, 'security')}
            onToggleStatus={() => handleOpenStatus(staff)}
            onDelete={() => handleOpenDeleteStaff(staff)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
        </div>

        {canManage && (
          <Button
            variant="primary"
            onClick={handleOpenAdd}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Plan Resource Usage Indicator */}
      {orgOverview?.usage && (
        <Card padding="sm" className="bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-600">
              Staff Usage ({orgOverview.plan?.name || 'Active Plan'}):
            </span>
            <span className="text-slate-800">
              <strong className="text-emerald-600">{orgOverview.usage.staffCount}</strong> /{' '}
              {orgOverview.usage.staffLimit} staff accounts created
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{
                width: `${Math.min(
                  (orgOverview.usage.staffCount / orgOverview.usage.staffLimit) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </Card>
      )}

      {/* Search & Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name, phone or email..."
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
        <Button variant="outline" size="md" onClick={fetchStaffData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading staff accounts..." />
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
      ) : filteredStaff.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-slate-500" />}
          title="No staff members found"
          description={
            searchQuery
              ? `No staff match "${searchQuery}". Try a different name or clear search.`
              : `No staff members assigned to ${currentBranch ? currentBranch.name : 'this counter'}.`
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
        <Card padding="none" className="min-h-[220px]">
          <DataTable<Staff> data={filteredStaff} columns={columns} keyExtractor={(item: Staff) => item.id} />
        </Card>
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

            <button
              type="button"
              onClick={() => setStaffTab('security')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                staffTab === 'security'
                  ? 'border-emerald-600 text-emerald-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>Security</span>
            </button>
          </div>

          {/* Tab Content Panes (Natural scrolling without nested scroll trapping) */}
          <div className="max-h-[64vh] overflow-y-auto pr-1">
            {/* ── TAB 1: OVERVIEW ── */}
            {staffTab === 'overview' && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <span className="text-xs text-slate-500">Account Status</span>
                    <div className="flex items-center gap-2 pt-1">
                      {selectedStaff?.status === 'PENDING_ACTIVATION' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                          Pending Activation
                        </span>
                      ) : (
                        <Badge variant={selectedStaff?.status === 'ACTIVE' ? 'success' : 'danger'}>
                          {selectedStaff?.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <span className="text-xs text-slate-500">Assigned Counters</span>
                    <p className="font-mono text-sm font-bold text-slate-800 pt-1">
                      {formBranchIds.length} branch(es)
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <span className="text-xs text-slate-500">Granted Permissions</span>
                    <p className="font-mono text-sm font-bold text-emerald-700 pt-1">
                      {formPermissions.length} / 20 permissions
                    </p>
                  </div>
                </div>

                {/* Account Details & Edit Fields */}
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Staff Profile Information
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="staff-edit-name"
                      label="Full Name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      error={formErrors.name}
                      disabled={!canManage || isSubmitting}
                    />

                    <Input
                      id="staff-edit-phone"
                      label="Phone Number"
                      placeholder="e.g. 9876543210"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      error={formErrors.phone}
                      disabled={!canManage || isSubmitting}
                    />
                  </div>

                  <div>
                    <Input
                      id="staff-edit-email"
                      type="email"
                      label="Email Address (Optional)"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      error={formErrors.email}
                      disabled={!canManage || isSubmitting}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500">Staff ID:</span>
                      <p className="font-mono font-semibold text-slate-700">STAFF-#{selectedStaff?.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Created Date:</span>
                      <p className="font-semibold text-slate-700">
                        {selectedStaff?.createdAt ? formatDate(selectedStaff.createdAt) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Security & Password Summary */}
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Security & Credentials
                      </h4>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setStaffTab('security')}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Change Password →
                      </button>
                    )}
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
                        onClick={() =>
                          setFormPermissions([
                            'CARD_VIEW',
                            'CARD_ISSUE',
                            'CARD_RETURN',
                            'CARD_BLOCK',
                            'CARD_UNBLOCK',
                            'RECHARGE',
                            'PURCHASE',
                            'REFUND',
                            'SESSION_VIEW',
                            'PRODUCT_VIEW',
                            'PRODUCT_MANAGE',
                            'INVENTORY_VIEW',
                            'INVENTORY_MANAGE',
                            'INVENTORY_IMPORT',
                            'VIEW_ANALYTICS',
                            'VIEW_REPORTS',
                            'STAFF_VIEW',
                            'STAFF_MANAGE',
                            'BRANCH_VIEW',
                            'BRANCH_MANAGE',
                          ])
                        }
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Select All (20)
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setFormPermissions([])}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <PermissionMatrix
                  selectedPermissions={formPermissions}
                  onChange={canManage ? setFormPermissions : undefined}
                  readOnly={!canManage}
                />


              </div>
            )}

            {/* ── TAB 3: BRANCHES ── */}
            {staffTab === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-end pb-2">
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormBranchIds(branches.map((b) => b.id))}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setFormBranchIds([])}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {branches.map((b) => {
                    const isAssigned = formBranchIds.includes(b.id);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => {
                          if (isAssigned) {
                            setFormBranchIds(formBranchIds.filter((id) => id !== b.id));
                          } else {
                            setFormBranchIds([...formBranchIds, b.id]);
                          }
                        }}
                        role="checkbox"
                        aria-checked={isAssigned}
                        disabled={!canManage}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs text-left transition-all select-none ${!canManage ? "pointer-events-none opacity-80" : ""} ${
                          isAssigned
                            ? 'border-emerald-500 bg-emerald-50 text-slate-900'
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
                          <div>
                            <p className="font-semibold text-slate-800">{b.name}</p>
                            <span className="text-[11px] text-slate-500">{b.name}</span>
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

            {/* ── TAB 4: SECURITY & CHANGE PASSWORD ── */}
            {staffTab === 'security' && (
              <div className="space-y-5">

                {passwordChangeError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <span>{passwordChangeError}</span>
                  </div>
                )}

                {passwordChangeSuccess && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{passwordChangeSuccess}</span>
                  </div>
                )}

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Change Password
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                          title={showNewPassword ? 'Hide password' : 'Show password'}
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
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                  </div>

                  {/* Password requirements checklist */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                    <span className="font-semibold text-slate-600">Password Requirements:</span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                      <div className={`flex items-center gap-1.5 ${formNewPassword.length >= 8 ? 'text-emerald-600 font-medium' : ''}`}>
                        <span className="text-xs">•</span> At least 8 characters
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(formNewPassword) ? 'text-emerald-600 font-medium' : ''}`}>
                        <span className="text-xs">•</span> One uppercase letter [A-Z]
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[a-z]/.test(formNewPassword) ? 'text-emerald-600 font-medium' : ''}`}>
                        <span className="text-xs">•</span> One lowercase letter [a-z]
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[0-9]/.test(formNewPassword) ? 'text-emerald-600 font-medium' : ''}`}>
                        <span className="text-xs">•</span> One number [0-9]
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(formNewPassword) ? 'text-emerald-600 font-medium' : ''}`}>
                        <span className="text-xs">•</span> One special character (!@#$)
                      </div>
                      <div className={`flex items-center gap-1.5 ${formNewPassword && formNewPassword === formConfirmPassword ? 'text-emerald-600 font-medium' : ''}`}>
                        <span className="text-xs">•</span> Passwords match
                      </div>
                    </div>
                  </div>


                  {canManage && (
                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleChangeStaffPassword}
                        isLoading={isChangingPassword}
                        disabled={isChangingPassword || !formNewPassword || !formConfirmPassword}
                        leftIcon={<Key className="h-4 w-4" />}
                      >
                        Change Password
                      </Button>
                    </div>
                  )}
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
            {canManage && staffTab === 'branches' && (
              <Button type="button" variant="primary" onClick={handleSaveBranches} isLoading={isSubmitting} disabled={isSubmitting} leftIcon={<Building2 className="h-4 w-4" />}>
                Save Branches
              </Button>
            )}
          </ModalFooter>
        </form>
      </Modal>

      {/* ── 2. ADD STAFF MEMBER MODAL (TABBED STEPPER UX) ── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Staff Member"
        description="Register a staff member, authorize counters, and assign operational permissions."
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Input
                      id="add-staff-password"
                      type={showAddPassword ? 'text' : 'password'}
                      label="Login Password *"
                      placeholder="Min 6 characters"
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

                  <Input
                    id="add-staff-email"
                    type="email"
                    label="Staff Email (Optional)"
                    placeholder="e.g. staff@example.com"
                    maxLength={100}
                    value={formEmail}
                    onChange={(e) => {
                      setFormEmail(e.target.value);
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    error={formErrors.email}
                    disabled={isSubmitting}
                  />
                </div>

                <p className="text-[11px] text-slate-500">
                  Staff log in to the mobile POS app using their <strong>Phone Number</strong> and <strong>Password</strong>. Their account is activated immediately upon creation.
                </p>

                {orgOverview?.usage && (
                  <p className="text-xs text-slate-500 pt-2">
                    Active subscription allows up to {orgOverview.usage.staffLimit} staff accounts (
                    {orgOverview.usage.staffLimit - orgOverview.usage.staffCount} slots available).
                  </p>
                )}
              </div>
            )}

            {/* ── STEP 2: BRANCHES ── */}
            {addTab === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs text-slate-500">
                    Assign this staff member to one or more physical branches.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormBranchIds(branches.map((b) => b.id))}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Select All ({branches.length})
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFormBranchIds([])}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {branches.map((b) => {
                    const isAssigned = formBranchIds.includes(b.id);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => {
                          if (isAssigned) {
                            setFormBranchIds(formBranchIds.filter((id) => id !== b.id));
                          } else {
                            setFormBranchIds([...formBranchIds, b.id]);
                          }
                        }}
                        role="checkbox"
                        aria-checked={isAssigned}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs text-left transition-all select-none ${
                          isAssigned
                            ? 'border-emerald-500 bg-emerald-50 text-slate-900'
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
                          <div>
                            <p className="font-semibold text-slate-800">{b.name}</p>
                            <span className="text-[11px] text-slate-500">{b.name}</span>
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

                  {/* 3 Large Role Preset Cards */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Preset 1: Cashier */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormPermissions([
                          'CARD_VIEW',
                          'CARD_ISSUE',
                          'CARD_RETURN',
                          'RECHARGE',
                          'PURCHASE',
                          'SESSION_VIEW',
                          'PRODUCT_VIEW',
                          'INVENTORY_VIEW',
                        ]);
                      }}
                      className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer select-none ${
                        formPermissions.length === 8 && formPermissions.includes('PURCHASE') && !formPermissions.includes('PRODUCT_MANAGE')
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Recommended
                          </span>
                          {formPermissions.length === 8 && formPermissions.includes('PURCHASE') && !formPermissions.includes('PRODUCT_MANAGE') && (
                            <Check className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-slate-900">Cashier / POS</h5>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Card issuing, recharge, customer checkout, and sales at counter.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-600 font-semibold mt-3">
                        8 permissions
                      </span>
                    </button>

                    {/* Preset 2: Supervisor */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormPermissions([
                          'CARD_VIEW',
                          'CARD_ISSUE',
                          'CARD_RETURN',
                          'CARD_BLOCK',
                          'CARD_UNBLOCK',
                          'RECHARGE',
                          'PURCHASE',
                          'REFUND',
                          'SESSION_VIEW',
                          'PRODUCT_VIEW',
                          'PRODUCT_MANAGE',
                          'INVENTORY_VIEW',
                          'INVENTORY_MANAGE',
                          'INVENTORY_IMPORT',
                          'BRANCH_VIEW',
                          'STAFF_VIEW',
                        ]);
                      }}
                      className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer select-none ${
                        formPermissions.length === 16 && formPermissions.includes('INVENTORY_MANAGE') && !formPermissions.includes('STAFF_MANAGE')
                          ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Counter Lead
                          </span>
                          {formPermissions.length === 16 && formPermissions.includes('INVENTORY_MANAGE') && !formPermissions.includes('STAFF_MANAGE') && (
                            <Check className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-slate-900">Supervisor</h5>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Cashier duties + stock counting, menu pricing, and team directory view.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-amber-600 font-semibold mt-3">
                        16 permissions
                      </span>
                    </button>

                    {/* Preset 3: Manager / Admin */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormPermissions([
                          'CARD_VIEW',
                          'CARD_ISSUE',
                          'CARD_RETURN',
                          'CARD_BLOCK',
                          'CARD_UNBLOCK',
                          'RECHARGE',
                          'PURCHASE',
                          'REFUND',
                          'SESSION_VIEW',
                          'PRODUCT_VIEW',
                          'PRODUCT_MANAGE',
                          'INVENTORY_VIEW',
                          'INVENTORY_MANAGE',
                          'INVENTORY_IMPORT',
                          'VIEW_ANALYTICS',
                          'VIEW_REPORTS',
                          'STAFF_VIEW',
                          'STAFF_MANAGE',
                          'BRANCH_VIEW',
                          'BRANCH_MANAGE',
                        ]);
                      }}
                      className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer select-none ${
                        formPermissions.length === 20
                          ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Full Access
                          </span>
                          {formPermissions.length === 20 && (
                            <Check className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-slate-900">Manager / Admin</h5>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Full access to manage team members, counter settings, and all operations.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-700 font-semibold mt-3">
                        All 20 permissions
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
                      <span className="text-slate-500 font-medium block mb-1">Assigned Counters</span>
                      <p className="font-semibold text-slate-900">
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

      {/* ── 3. ACTIVATE / DEACTIVATE CONFIRMATION MODAL ── */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={selectedStaff?.status === 'ACTIVE' ? 'Deactivate Staff Account' : 'Activate Staff Account'}
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span>{modalApiError}</span>
            </div>
          )}

          <p className="text-sm text-slate-700">
            Are you sure you want to{' '}
            <strong className="text-slate-900">
              {selectedStaff?.status === 'ACTIVE' ? 'deactivate' : 'activate'}
            </strong>{' '}
            the staff member <span className="text-emerald-700 font-semibold">{selectedStaff?.name}</span>?
          </p>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)} disabled={isSubmitting}>
              Close
            </Button>
            <Button
              variant={selectedStaff?.status === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={handleStatusSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Confirm {selectedStaff?.status === 'ACTIVE' ? 'Deactivation' : 'Activation'}
            </Button>
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
                const text = `Staff Login Credentials:\nName: ${createdStaffCredentials.name}\nPhone: ${createdStaffCredentials.phone}\nPassword: ${createdStaffCredentials.password}`;
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
                const message = `Hello ${createdStaffCredentials.name},\n\nYour staff account for Money Card POS has been created!\n\n📱 Login Phone: ${createdStaffCredentials.phone}\n🔑 Password: ${createdStaffCredentials.password}\n\nPlease open the Money Card POS App on your phone and log in with your phone number and password.`;
                const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
                window.open(waUrl, '_blank');
              }}
              leftIcon={<ExternalLink className="h-4 w-4" />}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white border-none"
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
      {/* ── Delete Staff Confirmation Modal ───────────────────────── */}
      <Modal
        isOpen={showDeleteStaffModal}
        onClose={() => !isSubmitting && setShowDeleteStaffModal(false)}
        title="Delete Staff Member"
        description="Permanently remove staff account or safely deactivate"
        size="md"
      >
        <div className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Action Blocked</p>
                <p>{modalApiError}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
            <p className="text-sm text-slate-800 font-medium">
              Are you sure you want to remove <span className="text-emerald-700 font-bold font-mono">{selectedStaff?.name}</span> ({selectedStaff?.email})?
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              If this staff member has never processed sessions or transactions, their account will be permanently removed. If historical transaction records exist, their access will be safely deactivated and tokens revoked, preserving all "Performed By" audit history.
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteStaffModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteStaffSubmit}
              isLoading={isSubmitting}
            >
              Confirm Deletion
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
