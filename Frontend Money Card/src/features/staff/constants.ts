// ─── Staff Permission Categories Constants (M6) ─────────────
// Grouping for M0 permission matrix with logical dependencies.

import type { Permission } from '@/types';
import {
  CreditCard,
  Clock,
  Package,
  ShieldCheck,
} from 'lucide-react';
import React from 'react';

export interface PermissionItemConfig {
  key: Permission;
  linkedKeys?: Permission[];
  label: string;
  description: string;
  prerequisite?: Permission;
}

export interface PermissionCategoryConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  permissions: PermissionItemConfig[];
}

// ── Logical Permission Dependencies ────────────────────────────
// If a permission key is granted, its required prerequisite(s) MUST also be granted.
// If a prerequisite is revoked, all dependent subordinate permissions are automatically revoked.
export const PERMISSION_DEPENDENCIES: Partial<Record<Permission, Permission[]>> = {
  CARD_ISSUE: ['CARD_VIEW'],
  CARD_RETURN: ['CARD_VIEW'],
  CARD_BLOCK: ['CARD_VIEW'],
  CARD_UNBLOCK: ['CARD_VIEW'],
  PRODUCT_MANAGE: ['PRODUCT_VIEW'],
  BRANCH_MANAGE: ['BRANCH_VIEW', 'STAFF_VIEW'],
  STAFF_MANAGE: ['BRANCH_VIEW', 'STAFF_VIEW'],
  VIEW_ANALYTICS: ['BRANCH_VIEW', 'STAFF_VIEW'],
  VIEW_REPORTS: ['BRANCH_VIEW', 'STAFF_VIEW'],
  REFUND: ['SESSION_VIEW'],
};

export const PERMISSION_CHILDREN: Partial<Record<Permission, Permission[]>> = {
  CARD_VIEW: ['CARD_ISSUE', 'CARD_RETURN', 'CARD_BLOCK', 'CARD_UNBLOCK'],
  PRODUCT_VIEW: ['PRODUCT_MANAGE'],
  BRANCH_VIEW: ['BRANCH_MANAGE', 'STAFF_MANAGE', 'VIEW_ANALYTICS', 'VIEW_REPORTS'],
  STAFF_VIEW: ['BRANCH_MANAGE', 'STAFF_MANAGE', 'VIEW_ANALYTICS', 'VIEW_REPORTS'],
  SESSION_VIEW: ['REFUND'],
};

export const PERMISSION_GROUPS: PermissionCategoryConfig[] = [
  {
    id: 'cards',
    title: 'Cards Management',
    icon: React.createElement(CreditCard, { className: 'h-4 w-4 text-emerald-600' }),
    permissions: [
      { key: 'CARD_VIEW', label: 'CARD_VIEW', description: 'View card balances and card list (Prerequisite for all card actions)' },
      { key: 'CARD_ISSUE', label: 'CARD_ISSUE', description: 'Issue new cards to users (Requires CARD_VIEW)', prerequisite: 'CARD_VIEW' },
      { key: 'CARD_RETURN', label: 'CARD_RETURN', description: 'Process card returns and refunds (Requires CARD_VIEW)', prerequisite: 'CARD_VIEW' },
      {
        key: 'CARD_BLOCK',
        linkedKeys: ['CARD_UNBLOCK'],
        label: 'CARD_BLOCK & UNBLOCK',
        description: 'Block and unblock lost or compromised cards (Requires CARD_VIEW)',
        prerequisite: 'CARD_VIEW',
      },
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions & Operations',
    icon: React.createElement(Clock, { className: 'h-4 w-4 text-emerald-600' }),
    permissions: [
      { key: 'RECHARGE', label: 'RECHARGE', description: 'Recharge card balance with cash/UPI' },
      { key: 'PURCHASE', label: 'PURCHASE', description: 'Allows staff to add products to cart and checkout' },
      { key: 'SESSION_VIEW', label: 'SESSION_VIEW', description: 'View active and historical cafeteria sessions' },
      { key: 'REFUND', label: 'REFUND', description: 'Refund purchase transactions (Requires SESSION_VIEW)', prerequisite: 'SESSION_VIEW' },
    ],
  },
  {
    id: 'products',
    title: 'Products & Menu',
    icon: React.createElement(Package, { className: 'h-4 w-4 text-emerald-600' }),
    permissions: [
      {
        key: 'PRODUCT_VIEW',
        label: 'PRODUCT_VIEW',
        description: 'View catalog products and prices (Prerequisite for management)',
      },
      {
        key: 'PRODUCT_MANAGE',
        label: 'PRODUCT_MANAGE',
        description: 'Create and edit products (Requires View)',
        prerequisite: 'PRODUCT_VIEW',
      },
    ],
  },
  {
    id: 'admin_analytics',
    title: 'Branches, Staff, Analytics & Reports',
    icon: React.createElement(ShieldCheck, { className: 'h-4 w-4 text-emerald-600' }),
    permissions: [
      {
        key: 'BRANCH_VIEW',
        linkedKeys: ['STAFF_VIEW'],
        label: 'BRANCH & STAFF VIEW',
        description: 'View branch details and staff member directory (Prerequisite for admin actions)',
      },
      {
        key: 'BRANCH_MANAGE',
        linkedKeys: ['STAFF_MANAGE', 'VIEW_ANALYTICS', 'VIEW_REPORTS'],
        label: 'BRANCH, STAFF & ANALYTICS MANAGE',
        description: 'Manage branches, staff accounts, analytics dashboards, and reports (Requires View)',
        prerequisite: 'BRANCH_VIEW',
      },
    ],
  },
];

// ── Role Constants: Manager (Recharge Cards) vs Staff (Deduct Amount) ──
export const MANAGER_PERMISSIONS: Permission[] = [
  'CARD_VIEW',
  'CARD_ISSUE',
  'CARD_RETURN',
  'CARD_BLOCK',
  'CARD_UNBLOCK',
  'RECHARGE',
  'PURCHASE',
  'SESSION_VIEW',
  'REFUND',
  'PRODUCT_VIEW',
  'PRODUCT_MANAGE',
  'STAFF_VIEW',
  'STAFF_MANAGE',
  'BRANCH_VIEW',
  'VIEW_ANALYTICS',
  'VIEW_REPORTS',
];

export const STAFF_PERMISSIONS: Permission[] = [
  'CARD_VIEW',
  'PURCHASE',
  'PRODUCT_VIEW',
  'PRODUCT_MANAGE',
  'SESSION_VIEW',
];

export const KITCHEN_PERMISSIONS: Permission[] = [
  'PRODUCT_VIEW',
  'PRODUCT_MANAGE',
  'SESSION_VIEW',
];

// ── Operational Capabilities (Billing, Recharge, Refunds, Card Management, Menu, Analytics) ──
export interface OperationalCapabilityConfig {
  id: string;
  label: string;
  description: string;
  permissions: Permission[];
}

export const OPERATIONAL_CAPABILITIES: OperationalCapabilityConfig[] = [
  {
    id: 'billing',
    label: 'Billing',
    description: 'Take food orders and deduct balance',
    permissions: ['PURCHASE', 'PRODUCT_VIEW', 'CARD_VIEW', 'SESSION_VIEW'],
  },
  {
    id: 'recharge',
    label: 'Recharge Cards',
    description: 'Cash and UPI top-up',
    permissions: ['RECHARGE', 'CARD_VIEW', 'SESSION_VIEW'],
  },
  {
    id: 'refund',
    label: 'Refund Transactions',
    description: 'Process transaction refunds',
    permissions: ['REFUND', 'SESSION_VIEW'],
  },
  {
    id: 'card_management',
    label: 'Card Management',
    description: 'Issue, return, block and unblock cards',
    permissions: ['CARD_ISSUE', 'CARD_RETURN', 'CARD_BLOCK', 'CARD_UNBLOCK', 'CARD_VIEW'],
  },
  {
    id: 'menu_products',
    label: 'Menu and Products',
    description: 'Manage menu items and prices',
    permissions: ['PRODUCT_VIEW', 'PRODUCT_MANAGE'],
  },
  {
    id: 'view_analytics',
    label: 'View Analytics',
    description: 'Access performance reports and metrics',
    permissions: ['VIEW_ANALYTICS', 'VIEW_REPORTS', 'BRANCH_VIEW', 'STAFF_VIEW'],
  },
];

export const CAPABILITY_PRESETS = {
  billing_counter: ['billing', 'menu_products'],
  cashier_counter: ['billing', 'recharge', 'card_management', 'refund'],
  full_access: ['billing', 'recharge', 'refund', 'card_management', 'menu_products', 'view_analytics'],
};

export function capabilitiesToPermissions(capabilityIds: string[]): Permission[] {
  const permsSet = new Set<Permission>();
  for (const capId of capabilityIds) {
    const found = OPERATIONAL_CAPABILITIES.find((c) => c.id === capId);
    if (found) {
      found.permissions.forEach((p) => permsSet.add(p));
    }
  }
  return Array.from(permsSet);
}

export function permissionsToCapabilities(permissions: Permission[]): string[] {
  const caps: string[] = [];
  if (permissions.includes('PURCHASE')) caps.push('billing');
  if (permissions.includes('RECHARGE')) caps.push('recharge');
  if (permissions.includes('REFUND')) caps.push('refund');
  if (
    permissions.includes('CARD_ISSUE') ||
    permissions.includes('CARD_RETURN') ||
    permissions.includes('CARD_BLOCK') ||
    permissions.includes('CARD_UNBLOCK')
  ) {
    caps.push('card_management');
  }
  if (permissions.includes('PRODUCT_VIEW') || permissions.includes('PRODUCT_MANAGE')) {
    caps.push('menu_products');
  }
  if (permissions.includes('VIEW_ANALYTICS') || permissions.includes('VIEW_REPORTS')) {
    caps.push('view_analytics');
  }
  return caps;
}


