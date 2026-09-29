export type Role = 'SUPERADMIN' | 'MANAGER_OPS' | 'SPV_OPS' | 'LEADER_OPS' | 'AGEN' | 'SPV_QC' | 'STAFF_QC' | 'SPV_HR' | 'STAFF_HR';

export type Action = 'create' | 'read' | 'update' | 'delete';

export type Division = 'IT' | 'OPS' | 'QC' | 'HR';

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

// Division-specific menu visibility
export const DIVISION_MENUS: Record<Division, Feature[]> = {
  IT: ['dashboard', 'master_item', 'master_vendor', 'inventory_type_item', 'transaction_item', 'purchase_request', 'delivery_order', 'vendor_submission', 'reporting'],
  OPS: ['dashboard', 'transaction_item', 'reporting'],
  QC: ['dashboard', 'transaction_item', 'reporting'],
  HR: ['dashboard', 'user_management', 'reporting'],
};

// Role permissions (same as before, but now division-scoped)
export const ROLE_PERMISSIONS: Record<Role, Record<Feature, Action[]>> = {
  SUPERADMIN: {
    dashboard: ['read'], master_item: ['create', 'read', 'update', 'delete'], master_vendor: ['create', 'read', 'update', 'delete'],
    inventory_type_item: ['create', 'read', 'update', 'delete'], transaction_item: ['create', 'read', 'update', 'delete'],
    purchase_request: ['create', 'read', 'update', 'delete'], delivery_order: ['create', 'read', 'update', 'delete'],
    vendor_submission: ['create', 'read', 'update', 'delete'], user_management: ['create', 'read', 'update', 'delete'],
    reporting: ['create', 'read', 'update', 'delete'],
  },
  MANAGER_OPS: {
    dashboard: ['read'], master_item: ['read'], master_vendor: ['read'], inventory_type_item: ['read'],
    transaction_item: ['create', 'read', 'update'], purchase_request: [], delivery_order: [],
    vendor_submission: ['read'], user_management: [], reporting: ['read'],
  },
  SPV_OPS: {
    dashboard: ['read'], master_item: ['read'], master_vendor: ['read'], inventory_type_item: ['create', 'read', 'update'],
    transaction_item: ['create', 'read', 'update'], purchase_request: [], delivery_order: [],
    vendor_submission: ['read'], user_management: [], reporting: ['read'],
  },
  LEADER_OPS: {
    dashboard: ['read'], master_item: ['read'], master_vendor: ['read'], inventory_type_item: ['read'],
    transaction_item: ['create', 'read', 'update'], purchase_request: [], delivery_order: [],
    vendor_submission: ['read'], user_management: [], reporting: ['read'],
  },
  AGEN: {
    dashboard: ['read'], master_item: [], master_vendor: [], inventory_type_item: [],
    transaction_item: ['create', 'read'], purchase_request: [], delivery_order: [],
    vendor_submission: [], user_management: [], reporting: [],
  },
  SPV_QC: {
    dashboard: ['read'], master_item: [], master_vendor: [], inventory_type_item: [],
    transaction_item: ['create', 'read', 'update'], purchase_request: [], delivery_order: [],
    vendor_submission: [], user_management: [], reporting: ['read'],
  },
  STAFF_QC: {
    dashboard: ['read'], master_item: [], master_vendor: [], inventory_type_item: [],
    transaction_item: ['create', 'read'], purchase_request: [], delivery_order: [],
    vendor_submission: [], user_management: [], reporting: [],
  },
  SPV_HR: {
    dashboard: ['read'], master_item: [], master_vendor: [], inventory_type_item: [],
    transaction_item: ['read'], purchase_request: [], delivery_order: [],
    vendor_submission: [], user_management: ['read'], reporting: ['read'],
  },
  STAFF_HR: {
    dashboard: ['read'], master_item: [], master_vendor: [], inventory_type_item: [],
    transaction_item: ['read'], purchase_request: [], delivery_order: [],
    vendor_submission: [], user_management: [], reporting: [],
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

// Check if user can access a specific division
export function canAccessDivision(role: Role, userDivision: string | null, targetDivision: Division): boolean {
  // SuperAdmin can access all divisions
  if (role === 'SUPERADMIN') return true;
  // User can only access their own division
  return userDivision === targetDivision;
}

// Get menus for a specific division
export function getDivisionMenus(division: Division): Feature[] {
  return DIVISION_MENUS[division] || [];
}
