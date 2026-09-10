import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '@/services/api';
import type { OrganizationOverview, Plan } from '@/types';
import {
  Button,
  Card,
  Badge,
  Modal,
  ModalFooter,
  Input,
  Select,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatDate } from '@/utils';
import {
  Building,
  Search,
  Power,
  Eye,
  EyeOff,
  Edit2,
  RefreshCw,
  AlertCircle,
  Building2,
  Users,
  CreditCard,
  ShieldAlert,
  Plus,
  KeyRound,
  Trash2,
  MoreVertical,
  ChevronDown,
  Send,
  Mail,
  Clock,
} from 'lucide-react';

interface OrgActionMenuProps {
  org: OrganizationOverview;
  onViewDetails: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onResendAdminInvite?: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function OrgActionMenu({
  org,
  onViewDetails,
  onEdit,
  onResetPassword,
  onResendAdminInvite,
  onToggleStatus,
  onDelete,
}: OrgActionMenuProps) {
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
    const menuHeight = 220;

    // Check if bottom space is constrained in the viewport
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
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Cafeteria actions"
        className="flex items-center gap-1.5 text-xs py-1 px-2.5 bg-white border-slate-200 hover:border-emerald-500 text-slate-700"
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
            className="w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onViewDetails();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left"
            >
              <Eye className="h-4 w-4 text-slate-400" />
              <span>View Details</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left"
            >
              <Edit2 className="h-4 w-4 text-emerald-600" />
              <span>Edit Cafeteria</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onResetPassword();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-amber-700 transition-colors cursor-pointer text-left"
            >
              <KeyRound className="h-4 w-4 text-amber-600" />
              <span>Reset Admin Password</span>
            </button>

            {onResendAdminInvite && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onResendAdminInvite();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-amber-700 transition-colors cursor-pointer text-left"
              >
                <Send className="h-4 w-4 text-amber-600" />
                <span>Resend Activation Invite</span>
              </button>
            )}

            {org.status !== 'PENDING_ACTIVATION' && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onToggleStatus();
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                  org.status === 'ACTIVE'
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <Power className="h-4 w-4" />
                <span>{org.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
              </button>
            )}

            <div className="my-1 border-t border-slate-200" />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Cafeteria</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationOverview[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // ── Client Filtered Organizations for Instant Search & Filtering ────────
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        org.name.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q) ||
        (org.adminUser?.name && org.adminUser.name.toLowerCase().includes(q)) ||
        (org.adminUser?.email && org.adminUser.email.toLowerCase().includes(q)) ||
        (org.plan?.name && org.plan.name.toLowerCase().includes(q));

      const matchesPlan =
        selectedPlanFilter === 'ALL' ||
        org.planId === selectedPlanFilter ||
        org.plan?.id === selectedPlanFilter;

      const matchesStatus =
        selectedStatusFilter === 'ALL' || org.status === selectedStatusFilter;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [organizations, searchQuery, selectedPlanFilter, selectedStatusFilter]);

  // ── Pending Email Activation Scope (Auto-updates & disappears when activated) ──
  const pendingOrganizations = useMemo(() => {
    return organizations.filter((org) => org.status === 'PENDING_ACTIVATION');
  }, [organizations]);

  // Modals
  const [selectedOrg, setSelectedOrg] = useState<OrganizationOverview | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdPendingOrg, setCreatedPendingOrg] = useState<{
    id: string;
    name: string;
    adminEmail: string;
  } | null>(null);
  const [showPendingSuccessModal, setShowPendingSuccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrgToDelete, setSelectedOrgToDelete] = useState<OrganizationOverview | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [confirmTempPassword, setConfirmTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showConfirmTempPassword, setShowConfirmTempPassword] = useState(false);
  const [tempPasswordError, setTempPasswordError] = useState<string | null>(null);
  const [confirmTempPasswordError, setConfirmTempPasswordError] = useState<string | null>(null);

  // Form State for Create Organization (3 Required Fields: Name, Admin Gmail, Plan)
  const [formName, setFormName] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formPlanId, setFormPlanId] = useState('plan_002');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form State for Edit Organization
  const [editFormName, setEditFormName] = useState('');
  const [editFormPlanId, setEditFormPlanId] = useState('plan_002');
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalApiError, setModalApiError] = useState<string | null>(null);

  // ── Fetch Organization List & Plans ────────────────────────
  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [res, plansRes] = await Promise.all([
        apiService.organizations.getOrganizations({ search: searchQuery }),
        apiService.plans.getPlans(),
      ]);

      if (!res.success) {
        setError(res.error.message || 'Failed to load platform cafeterias');
        return;
      }

      setOrganizations(res.data.items);
      if (plansRes.success) {
        setPlans(plansRes.data);
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
        const [res, plansRes] = await Promise.all([
          apiService.organizations.getOrganizations({ search: searchQuery }),
          apiService.plans.getPlans(),
        ]);
        if (isCancelled) return;

        if (!res.success) {
          setError(res.error.message || 'Failed to load platform cafeterias');
          return;
        }

        setOrganizations(res.data.items);
        if (plansRes.success) {
          setPlans(plansRes.data);
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
  }, [searchQuery]);

  // ── Open Reset Password Modal ──────────────────────────────
  const handleOpenResetPasswordModal = (org: OrganizationOverview) => {
    setSelectedOrg(org);
    setTempPassword('');
    setConfirmTempPassword('');
    setShowTempPassword(false);
    setShowConfirmTempPassword(false);
    setTempPasswordError(null);
    setConfirmTempPasswordError(null);
    setModalApiError(null);
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordSubmit = async () => {
    if (!selectedOrg) return;
    setTempPasswordError(null);
    setConfirmTempPasswordError(null);
    setModalApiError(null);

    let hasErrors = false;
    const trimmedTemp = tempPassword.trim();
    if (!trimmedTemp) {
      setTempPasswordError('Temporary password is required');
      hasErrors = true;
    } else if (trimmedTemp.length < 6) {
      setTempPasswordError('Password must be at least 6 characters');
      hasErrors = true;
    }

    const trimmedConfirm = confirmTempPassword.trim();
    if (!trimmedConfirm) {
      setConfirmTempPasswordError('Please confirm the temporary password');
      hasErrors = true;
    } else if (trimmedTemp && trimmedConfirm !== trimmedTemp) {
      setConfirmTempPasswordError('Passwords do not match');
      hasErrors = true;
    }

    if (hasErrors) return;

    setIsSubmitting(true);
    try {
      const res = await apiService.organizations.resetOrgAdminPassword(selectedOrg.id, {
        temporaryPassword: trimmedTemp,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to reset Org Admin password');
        return;
      }

      notify.success(res.data.message || `Password reset successfully for ${selectedOrg.adminUser?.name || 'Org Admin'}.`);
      setShowResetPasswordModal(false);
      setTempPassword('');
      setConfirmTempPassword('');
      setShowTempPassword(false);
      setShowConfirmTempPassword(false);
      fetchOrganizations();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateModal = () => {
    setFormName('');
    setFormAdminEmail('');
    setFormPlanId(plans[0]?.id || 'plan_002');
    setFormErrors({});
    setModalApiError(null);
    setShowCreateModal(true);
  };

  const validateCreateForm = (): boolean => {
    const errs: Record<string, string> = {};
    const trimmedName = formName.trim();
    if (!trimmedName) {
      errs.name = 'Cafeteria name is required';
    } else if (trimmedName.length > 30) {
      errs.name = 'Cafeteria name must be at most 30 characters';
    }

    const trimmedEmail = formAdminEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      errs.adminEmail = 'Org Admin Gmail address is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@(?:gmail|googlemail)\.com$/.test(trimmedEmail)) {
      errs.adminEmail = 'Please provide a valid Gmail address (@gmail.com)';
    }

    if (!formPlanId) {
      errs.planId = 'Subscription plan is required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateSubmit = async () => {
    if (!validateCreateForm()) return;

    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const trimmedEmail = formAdminEmail.trim().toLowerCase();
      const res = await apiService.organizations.createOrganization({
        name: formName.trim(),
        adminEmail: trimmedEmail,
        planId: formPlanId,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to create cafeteria');
        return;
      }

      setShowCreateModal(false);
      setCreatedPendingOrg({
        id: res.data.id,
        name: res.data.name,
        adminEmail: trimmedEmail,
      });
      setShowPendingSuccessModal(true);
      setFormName('');
      setFormAdminEmail('');
      fetchOrganizations();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendAdminInvite = async (org: OrganizationOverview) => {
    try {
      const res = await apiService.organizations.resendOrgAdminInvite(org.id);
      if (res.success) {
        notify.success(res.data?.message || `Activation invite sent to ${org.adminUser?.email || 'Org Admin'}`);
      } else {
        notify.error(res.error?.message || 'Failed to resend activation invite');
      }
    } catch {
      notify.error('Failed to resend activation invite. Please try again.');
    }
  };

  // ── Open Edit Modal ───────────────────────────────────────
  const handleOpenEditModal = (org: OrganizationOverview) => {
    setSelectedOrg(org);
    setEditFormName(org.name);
    setEditFormPlanId(org.plan?.id || org.planId || plans[0]?.id || 'plan_002');
    setEditFormErrors({});
    setModalApiError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedOrg) return;
    const trimmedEditName = editFormName.trim();
    if (!trimmedEditName) {
      setEditFormErrors({ name: 'Cafeteria name is required' });
      return;
    } else if (trimmedEditName.length > 30) {
      setEditFormErrors({ name: 'Cafeteria name must be at most 30 characters' });
      return;
    }

    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.organizations.updateAdminOrganization(selectedOrg.id, {
        name: editFormName.trim(),
        planId: editFormPlanId,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update cafeteria');
        return;
      }

      notify.success(`Cafeteria ${res.data.name} updated successfully!`);
      setShowEditModal(false);
      if (showDetailsModal) {
        setShowDetailsModal(false);
      }
      fetchOrganizations();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Details ──────────────────────────────────────────
  const handleOpenDetails = async (org: OrganizationOverview) => {
    setSelectedOrg(org);
    setShowDetailsModal(true);
    try {
      const res = await apiService.organizations.getOrganizationById(org.id);
      if (res.success) {
        setSelectedOrg(res.data);
      }
    } catch {
      // Keep existing overview data
    }
  };

  // ── Open Status Modal ─────────────────────────────────────
  const handleOpenStatusModal = (org: OrganizationOverview) => {
    setSelectedOrg(org);
    setModalApiError(null);
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async () => {
    if (!selectedOrg) return;

    const newStatus = selectedOrg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.organizations.updateAdminOrganization(selectedOrg.id, {
        status: newStatus,
      });

      if (!res.success) {
        setModalApiError(res.error.message || `Failed to ${newStatus.toLowerCase()} cafeteria`);
        return;
      }

      notify.success(`Cafeteria ${selectedOrg.name} is now ${newStatus.toLowerCase()}`);
      setShowStatusModal(false);
      fetchOrganizations();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Delete Modal ─────────────────────────────────────
  const handleOpenDeleteModal = (org: OrganizationOverview) => {
    setSelectedOrgToDelete(org);
    setModalApiError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteOrgSubmit = async () => {
    if (!selectedOrgToDelete) return;
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.organizations.deleteAdminOrganization(selectedOrgToDelete.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to delete cafeteria');
        return;
      }

      notify.success(`Cafeteria '${selectedOrgToDelete.name}' deleted successfully`);
      setShowDeleteModal(false);
      setSelectedOrgToDelete(null);
      if (showDetailsModal) {
        setShowDetailsModal(false);
      }
      fetchOrganizations();
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
      header: 'Cafeteria',
      sortable: true,
      render: (org: OrganizationOverview) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{org.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan & Quotas',
      render: (org: OrganizationOverview) => (
        <div>
          <Badge variant="outline" className="text-xs">
            {org.plan?.name || 'Standard'}
          </Badge>
          {org.usage && (
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
              <span>{org.usage.branchCount}/{org.usage.branchLimit} Counters</span>
              <span>•</span>
              <span>{org.usage.staffCount}/{org.usage.staffLimit} Staff</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (org: OrganizationOverview) => {
        if (org.status === 'PENDING_ACTIVATION') {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700 shadow-sm">
              <Mail className="h-3 w-3 text-amber-500" />
              Pending Activation via Email
            </span>
          );
        }
        return (
          <Badge variant={org.status === 'ACTIVE' ? 'success' : 'danger'}>
            {org.status}
          </Badge>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      render: (org: OrganizationOverview) => (
        <span className="text-xs text-slate-500">{formatDate(org.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (org: OrganizationOverview) => (
        <div className="flex items-center justify-end">
          <OrgActionMenu
            org={org}
            onViewDetails={() => handleOpenDetails(org)}
            onEdit={() => handleOpenEditModal(org)}
            onResetPassword={() => handleOpenResetPasswordModal(org)}
            onResendAdminInvite={() => handleResendAdminInvite(org)}
            onToggleStatus={() => handleOpenStatusModal(org)}
            onDelete={() => handleOpenDeleteModal(org)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Cafeterias</h1>
        </div>

        <div>
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Organization
          </Button>
        </div>
      </div>

      {/* ── Pending Activation UI Banner (Automatically disappears when all cafeterias are activated) ── */}
      {pendingOrganizations.length > 0 && (
        <div className="rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/60 p-4.5 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/70 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <span>Pending Email Activation</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                    {pendingOrganizations.length} {pendingOrganizations.length === 1 ? 'Cafeteria' : 'Cafeterias'}
                  </span>
                </h3>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  These cafeterias have been created and are awaiting administrator password setup via invitation email. Once activated, they automatically disappear from this pending list.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOrganizations()}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0 self-start sm:self-auto"
            >
              Check Status
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingOrganizations.map((org) => (
              <div
                key={org.id}
                className="flex flex-col justify-between rounded-lg border border-amber-200/80 bg-white/95 p-3.5 shadow-sm hover:shadow transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate" title={org.name}>
                      {org.name}
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending Activation
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate" title={org.adminUser?.email || ''}>
                    <span className="text-slate-400 font-medium">Admin:</span> {org.adminUser?.email || 'Invitation sent'}
                  </p>
                  {org.plan && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Plan: {org.plan.name}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-amber-700 font-medium">Awaiting invite</span>
                  <button
                    type="button"
                    onClick={() => handleResendAdminInvite(org)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                    <span>Resend Invite</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter Toolbar (Search, Plan Scope, Status Scope, Refresh Data) ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="w-full sm:w-72">
            <label className="mb-1 block text-[11px] font-medium text-slate-600">Search Cafeteria</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                maxLength={30}
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 30) {
                    setSearchQuery(val);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Plan Scope Filter */}
          <div className="w-full sm:w-48">
            <label className="mb-1 block text-[11px] font-medium text-slate-400">Plan Scope</label>
            <Select
              id="org-plan-filter"
              value={selectedPlanFilter}
              onChange={(e) => setSelectedPlanFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Plans' },
                ...plans.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          {/* Status Scope Filter */}
          <div className="w-full sm:w-48">
            <label className="mb-1 block text-[11px] font-medium text-slate-400">Status</label>
            <Select
              id="org-status-filter"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'PENDING_ACTIVATION', label: 'Pending Activation' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrganizations()}
          leftIcon={<RefreshCw className="h-4 w-4" />}
          className="shrink-0 self-start lg:self-center"
        >
          Refresh Data
        </Button>
      </div>

      {/* ── Main Data View ── */}
      {isLoading ? (
        <LoadingState message="Loading platform cafeterias..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchOrganizations} />
      ) : filteredOrganizations.length === 0 ? (
        <EmptyState
          title="No cafeterias found"
          description={
            searchQuery || selectedPlanFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
              ? 'No cafeterias matched your search or filter criteria.'
              : 'Get started by adding your first cafeteria.'
          }
          action={
            searchQuery || selectedPlanFilter !== 'ALL' || selectedStatusFilter !== 'ALL' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPlanFilter('ALL');
                  setSelectedStatusFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal} leftIcon={<Plus className="h-4 w-4" />}>
                Add Organization
              </Button>
            )
          }
        />
      ) : (
        <Card className="min-h-[220px]">
          <DataTable
            columns={columns}
            data={filteredOrganizations}
            keyExtractor={(item) => item.id}
          />
        </Card>
      )}

      {/* ── Create Organization Modal (4 Fields) ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Cafeteria"
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/70 p-3 text-xs text-emerald-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-emerald-900">
              <Mail className="h-4 w-4 text-emerald-600" />
              Email Activation Workflow
            </p>
            <p className="text-slate-600">
              A real Gmail address is required. An activation invitation email with a secure link will automatically be sent to the administrator. The cafeteria will remain in <strong>Pending Activation via Email</strong> status until the administrator accepts the invitation and sets their password.
            </p>
          </div>

          <Input
            id="create-org-name"
            label="Cafeteria Name *"
            placeholder="e.g. Acme Cafeteria"
            maxLength={30}
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
            id="create-org-admin-email"
            label="Org Admin Gmail Address *"
            type="email"
            placeholder="e.g. cafeteria.admin@gmail.com"
            value={formAdminEmail}
            onChange={(e) => {
              setFormAdminEmail(e.target.value);
              if (formErrors.adminEmail) setFormErrors((prev) => ({ ...prev, adminEmail: '' }));
            }}
            error={formErrors.adminEmail}
            disabled={isSubmitting}
          />

          {plans.length > 0 && (
            <Select
              label="Plan *"
              value={formPlanId}
              onChange={(e) => setFormPlanId(e.target.value)}
              error={formErrors.planId}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} (₹${p.price}/${p.billingInterval.toLowerCase()})`,
              }))}
            />
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
              Create Organization
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Pending Activation Confirmation Modal (Opens right after creating cafeteria) ── */}
      <Modal
        isOpen={showPendingSuccessModal}
        onClose={() => setShowPendingSuccessModal(false)}
        title="Cafeteria Created — Pending Activation"
      >
        <div className="py-2 space-y-4">
          <div className="flex flex-col items-center text-center p-4 rounded-xl border border-amber-500/20 bg-amber-50/60">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3 ring-8 ring-amber-50">
              <Mail className="h-7 w-7" />
            </div>
            <Badge variant="warning" className="mb-2">
              Pending Activation via Email
            </Badge>
            <h3 className="text-lg font-bold text-slate-900">
              {createdPendingOrg?.name}
            </h3>
            <p className="text-xs font-mono text-slate-600 mt-1">
              Admin: {createdPendingOrg?.adminEmail}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-2">
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-600" />
              What happens next?
            </p>
            <p>
              An invitation email has been dispatched to <strong>{createdPendingOrg?.adminEmail}</strong> with a secure link to activate the cafeteria and set their administrator password.
            </p>
            <p className="text-amber-800 bg-amber-100/60 p-2 rounded border border-amber-200/70 font-medium">
              Until the administrator accepts the invitation via email, this cafeteria remains in <strong>Pending Activation</strong> status and cannot be operated or logged into. Once activated, it automatically leaves the Pending list and appears as Active.
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!createdPendingOrg?.id) return;
                try {
                  const res = await apiService.organizations.resendOrgAdminInvite(createdPendingOrg.id);
                  if (res.success) {
                    notify.success(`Activation email resent to ${createdPendingOrg.adminEmail}`);
                  } else {
                    notify.error(res.error?.message || 'Failed to resend invite');
                  }
                } catch {
                  notify.error('Failed to resend email. Please try again.');
                }
              }}
              leftIcon={<Send className="h-4 w-4 text-amber-600" />}
            >
              Resend Email Invite
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPendingSuccessModal(false)}
            >
              Got it, View in Cafeterias
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Edit Organization Modal ── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Cafeteria"
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cafeteria ID</label>
            <input
              type="text"
              disabled
              value={selectedOrg?.id || ''}
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-500 cursor-not-allowed"
            />
          </div>

          <Input
            id="edit-org-name"
            label="Cafeteria Name *"
            placeholder="e.g. Acme Cafeterias"
            maxLength={30}
            value={editFormName}
            onChange={(e) => {
              setEditFormName(e.target.value);
              if (editFormErrors.name) setEditFormErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={editFormErrors.name}
          />

          {plans.length > 0 && (
            <Select
              label="Assigned Subscription Plan"
              value={editFormPlanId}
              onChange={(e) => setEditFormPlanId(e.target.value)}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} (₹${p.price}/${p.billingInterval.toLowerCase()})`,
              }))}
            />
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
              Save Changes
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Organization Details Modal ── */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Cafeteria Overview"
      >
        {selectedOrg && (
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedOrg.name}</h3>
                <p className="text-xs text-slate-500">ID: {selectedOrg.id}</p>
              </div>
              {selectedOrg.status === 'PENDING_ACTIVATION' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700 shadow-sm">
                  <Mail className="h-3 w-3 text-amber-500" />
                  Pending Activation via Email
                </span>
              ) : (
                <Badge variant={selectedOrg.status === 'ACTIVE' ? 'success' : 'danger'}>
                  {selectedOrg.status}
                </Badge>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Assigned Org Admin
                </span>
                {selectedOrg.adminUser?.mustChangePassword ? (
                  <Badge variant="warning" className="text-[10px]">
                    Password Reset Pending
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-[10px]">
                    Active
                  </Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedOrg.adminUser?.name || 'Org Admin'}
                  </p>
                  <p className="text-xs font-mono text-slate-500">
                    {selectedOrg.adminUser?.email || 'admin@' + selectedOrg.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenResetPasswordModal(selectedOrg);
                  }}
                  leftIcon={<KeyRound className="h-3.5 w-3.5 text-amber-600" />}
                >
                  Reset Password
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Active Subscription Plan
                </span>
                <Badge variant="outline">{selectedOrg.plan?.name || 'Standard Plan'}</Badge>
              </div>

              {selectedOrg.plan && (
                <div className="mt-3 text-xs">
                  <div>
                    <span className="text-slate-600">Price: </span>
                    <span className="font-semibold text-slate-900">₹{selectedOrg.plan.price}/mo</span>
                  </div>
                </div>
              )}
            </div>

            {selectedOrg.usage && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Resource Usage & Limits
                </h4>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Counters</span>
                    </div>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {selectedOrg.usage.branchCount} / {selectedOrg.usage.branchLimit}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Users className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Staff</span>
                    </div>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {selectedOrg.usage.staffCount} / {selectedOrg.usage.staffLimit}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-1 text-slate-500">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Cards</span>
                    </div>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {selectedOrg.usage.cardCount} / {selectedOrg.usage.cardLimit}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <ModalFooter>
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleOpenEditModal(selectedOrg);
                }}
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              >
                Edit Organization
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* ── Status Toggle Modal ── */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={selectedOrg?.status === 'ACTIVE' ? 'Deactivate Cafeteria' : 'Activate Cafeteria'}
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span>{modalApiError}</span>
            </div>
          )}

          <p className="text-sm text-slate-700">
            Are you sure you want to{' '}
            <strong className="text-slate-900">
              {selectedOrg?.status === 'ACTIVE' ? 'deactivate' : 'activate'}
            </strong>{' '}
            the cafeteria <span className="text-emerald-700 font-semibold">{selectedOrg?.name}</span>?
          </p>

          {selectedOrg?.status === 'ACTIVE' && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Deactivating this organization will prevent its users and staff from logging in or performing card operations.
              </span>
            </div>
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={selectedOrg?.status === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={handleStatusSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Confirm {selectedOrg?.status === 'ACTIVE' ? 'Deactivation' : 'Activation'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
      {/*  Reset Org Admin Password Modal  */}
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        title="Reset Org Admin Password"
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-200 space-y-1">
            <p className="font-semibold">
              Are you sure you want to reset the password for {selectedOrg?.adminUser?.name || 'Org Admin'}?
            </p>
            <p className="text-amber-300/80">
              Setting a temporary password will require the Org Admin to create a new private password upon their next login.
            </p>
          </div>

          <div className="space-y-2 text-xs border border-slate-200 rounded-lg p-3 bg-slate-50">
            <div className="flex justify-between">
              <span className="text-slate-600">Cafeteria:</span>
              <span className="font-semibold text-slate-900">{selectedOrg?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Admin Name:</span>
              <span className="font-semibold text-slate-900">{selectedOrg?.adminUser?.name || 'Org Admin'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Admin Email:</span>
              <span className="font-mono text-slate-800">
                {selectedOrg?.adminUser?.email || 'admin@' + (selectedOrg?.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'org') + '.com'}
              </span>
            </div>
          </div>

          <Input
            id="reset-temp-password"
            label="Temporary Password *"
            type={showTempPassword ? 'text' : 'password'}
            placeholder="Min. 6 characters"
            value={tempPassword}
            onChange={(e) => {
              setTempPassword(e.target.value);
              if (tempPasswordError) setTempPasswordError(null);
              if (modalApiError) setModalApiError(null);
            }}
            error={tempPasswordError ?? undefined}
            disabled={isSubmitting}
            rightElement={
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 flex items-center justify-center focus:outline-none"
                onClick={() => setShowTempPassword((prev) => !prev)}
                title={showTempPassword ? "Hide password" : "Show password"}
              >
                {showTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <Input
            id="reset-confirm-temp-password"
            label="Confirm Temporary Password *"
            type={showConfirmTempPassword ? 'text' : 'password'}
            placeholder="Confirm temporary password"
            value={confirmTempPassword}
            onChange={(e) => {
              setConfirmTempPassword(e.target.value);
              if (confirmTempPasswordError) setConfirmTempPasswordError(null);
              if (modalApiError) setModalApiError(null);
            }}
            error={confirmTempPasswordError ?? undefined}
            disabled={isSubmitting}
            rightElement={
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 flex items-center justify-center focus:outline-none"
                onClick={() => setShowConfirmTempPassword((prev) => !prev)}
                title={showConfirmTempPassword ? "Hide password" : "Show password"}
              >
                {showConfirmTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleResetPasswordSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
              Reset Org Admin Password
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Delete Organization Confirmation Modal ── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isSubmitting && setShowDeleteModal(false)}
        title="Delete Cafeteria"
        description="Permanently remove cafeteria and all related data"
        size="md"
      >
        <div className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Action Failed</p>
                <p>{modalApiError}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
            <p className="text-sm text-slate-800 font-medium">
              Are you sure you want to permanently delete{' '}
              <span className="text-emerald-700 font-bold font-mono">
                {selectedOrgToDelete?.name}
              </span>
              ?
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action cannot be undone. All branch locations, staff accounts, products, and registered smart cards belonging to this organization will be permanently deleted.
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteOrgSubmit}
              isLoading={isSubmitting}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete Organization
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
