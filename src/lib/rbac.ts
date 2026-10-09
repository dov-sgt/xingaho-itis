/**
 * RBAC — Database driven.
 *
 * IMPORTANT: roles and permissions are NOT hardcoded here. They live in the
 * `Role.permissions` JSON column and are resolved server-side in
 * `src/lib/session.ts`. This module only holds the shared *vocabulary*
 * (feature keys + action keys) plus pure helpers so client and server agree.
 *
 * `Role` is intentionally a plain `string`: role codes are user-managed via
 * the Role Management screen, so a hardcoded union would drift out of sync.
 */

export type Role = string;
export type Action = 'create' | 'read' | 'update' | 'delete';

export const ACTIONS: Action[] = ['create', 'read', 'update', 'delete'];

export const ACTION_LABELS: Record<Action, string> = {
  create: 'Buat',
  read: 'Lihat',
  update: 'Ubah',
  delete: 'Hapus',
};

/**
 * Canonical feature keys. Anything added here must also exist in the sidebar
 * (`src/components/Sidebar.tsx`) so menus and permissions stay aligned.
 */
export const FEATURES = [
  'dashboard',
  'master_item',
  'master_vendor',
  'inventory_type_item',
  'transaction_headset',
  'transaction_stockout',
  'purchase_request',
  'delivery_order',
  'vendor_submission',
  'booking',
  'servis_asset',
  'log_ruang_server',
  'recording_review',
  'finding',
  'employee_data',
  'leave_request',
  'user_management',
  'division_management',
  'role_management',
  'reporting',
] as const;

export type Feature = (typeof FEATURES)[number];

/**
 * Legacy / alternate feature keys kept working so older API routes and older
 * permission rows keep behaving exactly as before.
 */
export const FEATURE_ALIASES: Record<string, Feature> = {
  transaction_item: 'transaction_headset',
  headset: 'transaction_headset',
  headset_user: 'transaction_headset',
  stock_out: 'transaction_stockout',
  users: 'user_management',
  // Modul HR dulu memakai `user_management`; dipetakan ke feature baru supaya
  // HR bisa mengelola data karyawan tanpa ikut mendapat akses ke akun sistem.
  employees: 'employee_data',
  employee: 'employee_data',
  leave: 'leave_request',
  leave_requests: 'leave_request',
};

export function normalizeFeature(feature: string): Feature {
  return (FEATURE_ALIASES[feature] ?? feature) as Feature;
}

export type PermissionMap = Record<string, Action[] | undefined>;

/**
 * Safe permission lookup — tolerates malformed JSON stored by users.
 */
export function hasPermissionIn(
  permissions: PermissionMap | null | undefined,
  feature: string,
  action: Action,
): boolean {
  if (!permissions) return false;
  const key = normalizeFeature(feature);
  const list = permissions[key];
  if (!Array.isArray(list)) return false;
  return list.includes(action);
}

export function canAccessMenuIn(
  permissions: PermissionMap | null | undefined,
  feature: string,
): boolean {
  if (!permissions) return false;
  const list = permissions[normalizeFeature(feature)];
  return Array.isArray(list) && list.length > 0;
}

/** SuperAdmin short-circuit used by both client and server. */
export function isSuperAdmin(role: Role | null | undefined): boolean {
  return String(role || '').toUpperCase() === 'SUPERADMIN';
}

export function hasPermission(
  permissions: PermissionMap | null | undefined,
  feature: string,
  action: Action,
): boolean {
  return hasPermissionIn(permissions, feature, action);
}

export function canAccessMenu(
  permissions: PermissionMap | null | undefined,
  feature: string,
): boolean {
  return canAccessMenuIn(permissions, feature);
}

/** Human readable label for a role code, e.g. OPS_SPV -> "Ops Spv". */
export function roleLabel(code: string): string {
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}