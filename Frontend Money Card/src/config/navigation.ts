// ─── Navigation Configuration ──────────────────────────────
// Role & Permission-aware navigation config.
// Uses ONLY M0 permission identifiers.
// Staff operational UI and User Portal auth are EXCLUDED.

import type { UserRole, Permission } from '@/types';

export interface NavItemConfig {
  id: string;
  label: string;
  path: string;
  iconName: string;
  roles: UserRole[];
  permission?: Permission;
}

export const NAVIGATION_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    iconName: 'LayoutDashboard',
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'STAFF'],
  },
  {
    id: 'organizations',
    label: 'Organizations',
    path: '/organizations',
    iconName: 'Building',
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'plans-subscriptions',
    label: 'Plans & Subscriptions',
    path: '/plans-subscriptions',
    iconName: 'Layers',
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'branches',
    label: 'Cafeterias',
    path: '/branches',
    iconName: 'Building2',
    roles: ['ORG_ADMIN'],
    permission: 'BRANCH_VIEW',
  },
  {
    id: 'products',
    label: 'Menu',
    path: '/products',
    iconName: 'Package',
    roles: ['ORG_ADMIN', 'STAFF'],
    permission: 'PRODUCT_VIEW',
  },
  {
    id: 'staff',
    label: 'Staff',
    path: '/staff',
    iconName: 'Users',
    roles: ['ORG_ADMIN', 'STAFF'],
    permission: 'STAFF_VIEW',
  },
  {
    id: 'cards',
    label: 'Cards',
    path: '/cards',
    iconName: 'CreditCard',
    roles: ['ORG_ADMIN', 'STAFF'],
    permission: 'CARD_VIEW',
  },
  {
    id: 'sessions',
    label: 'Customer History',
    path: '/sessions',
    iconName: 'UserCheck',
    roles: ['ORG_ADMIN', 'STAFF'],
    permission: 'SESSION_VIEW',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    iconName: 'BarChart3',
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'STAFF'],
    permission: 'VIEW_ANALYTICS',
  },
  {
    id: 'subscriptions',
    label: 'Subscription',
    path: '/subscriptions',
    iconName: 'CreditCard',
    roles: ['ORG_ADMIN'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    iconName: 'Settings',
    roles: ['SUPER_ADMIN'],
  },
];
