export type Role = 'SUPERADMIN' | 'SPV' | 'STAFF' | 'VENDOR';

export type Action = 'create' | 'read' | 'update' | 'delete';

export type Feature =
  | 'dashboard'
  | 'master_item'
  | 'master_vendor'
  | 'inventory_type_item'
  | 'transaction_item'
  | 'purchase_request'
  | 'delivery_order'
  | 'vendor_submission'
  | 'user_management'
  | 'reporting';

export const ROLE_PERMISSIONS: Record<Role, Record<Feature, Action[]>> = {
  SUPERADMIN: {
    dashboard: ['read'],
    master_item: ['create', 'read', 'update', 'delete'],
    master_vendor: ['create', 'read', 'update', 'delete'],
    inventory_type_item: ['create', 'read', 'update', 'delete'],
    transaction_item: ['create', 'read', 'update', 'delete'],
    purchase_request: ['create', 'read', 'update', 'delete'],
    delivery_order: ['create', 'read', 'update', 'delete'],
    vendor_submission: ['update', 'delete', 'read'],
    user_management: ['create', 'read', 'update', 'delete'],
    reporting: ['create', 'read', 'update', 'delete'],
  },
  SPV: {
    dashboard: ['read'],
    master_item: ['create', 'read', 'update'],
    master_vendor: ['create', 'read', 'update'],
    inventory_type_item: ['create', 'read', 'update'],
    transaction_item: ['create', 'read', 'update'],
    purchase_request: ['create', 'read', 'update'],
    delivery_order: ['create', 'read', 'update'],
    vendor_submission: ['create', 'read', 'update', 'delete'],
    user_management: ['create', 'read', 'update'],
    reporting: ['create', 'read', 'update'],
  },
  STAFF: {
    dashboard: ['read'],
    master_item: ['read'],
    master_vendor: ['read'],
    inventory_type_item: ['read'],
    transaction_item: ['create', 'read'],
    purchase_request: [],
    delivery_order: [],
    vendor_submission: ['update', 'read'],
    user_management: [],
    reporting: ['read'],
  },
  VENDOR: {
    dashboard: [],
    master_item: [],
    master_vendor: [],
    inventory_type_item: [],
    transaction_item: [],
    purchase_request: [],
    delivery_order: [],
    vendor_submission: ['create', 'read'],
    user_management: [],
    reporting: [],
  },
};

export function hasPermission(role: Role, feature: Feature, action: Action): boolean {
  const permissions = ROLE_PERMISSIONS[role]?.[feature] || [];
  return permissions.includes(action);
}

export function canAccessMenu(role: Role, feature: Feature): boolean {
  const permissions = ROLE_PERMISSIONS[role]?.[feature] || [];
  return permissions.length > 0;
}
