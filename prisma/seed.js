const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// All available features/sub-menus
const ALL_FEATURES = [
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
];

// Role definitions with permissions per feature
const ROLES = [
  {
    code: 'SUPERADMIN',
    name: 'Super Admin',
    description: 'Full access to all features',
    permissions: ALL_FEATURES.reduce((acc, f) => ({ ...acc, [f]: ['create', 'read', 'update', 'delete'] }), {}),
  },
  {
    code: 'IT_MANAGER',
    name: 'IT Manager',
    description: 'Full access to IT division features',
    permissions: {
      dashboard: ['read'],
      master_item: ['create', 'read', 'update', 'delete'],
      master_vendor: ['create', 'read', 'update', 'delete'],
      inventory_type_item: ['create', 'read', 'update', 'delete'],
      transaction_headset: ['create', 'read', 'update', 'delete'],
      transaction_stockout: ['create', 'read', 'update', 'delete'],
      purchase_request: ['create', 'read', 'update', 'delete'],
      delivery_order: ['create', 'read', 'update', 'delete'],
      vendor_submission: ['create', 'read', 'update', 'delete'],
      booking: ['create', 'read', 'update', 'delete'],
      servis_asset: ['create', 'read', 'update', 'delete'],
      log_ruang_server: ['create', 'read', 'update', 'delete'],
      recording_review: ['create', 'read', 'update', 'delete'],
      finding: ['create', 'read', 'update', 'delete'],
      employee_data: [],
      leave_request: [],
      user_management: ['create', 'read', 'update', 'delete'],
      reporting: ['create', 'read', 'update', 'delete'],
    },
  },
  {
    code: 'IT_SPV',
    name: 'IT SPV',
    description: 'Supervisory access to IT division features',
    permissions: {
      dashboard: ['read'],
      master_item: ['create', 'read', 'update'],
      master_vendor: ['create', 'read', 'update'],
      inventory_type_item: ['create', 'read', 'update'],
      transaction_headset: ['create', 'read', 'update'],
      transaction_stockout: ['create', 'read', 'update'],
      purchase_request: ['create', 'read', 'update'],
      delivery_order: ['create', 'read', 'update'],
      vendor_submission: ['create', 'read', 'update'],
      booking: ['create', 'read', 'update'],
      servis_asset: ['create', 'read', 'update'],
      log_ruang_server: ['create', 'read', 'update'],
      recording_review: ['create', 'read', 'update'],
      finding: ['create', 'read', 'update'],
      employee_data: [],
      leave_request: [],
      user_management: ['create', 'read', 'update'],
      reporting: ['create', 'read', 'update'],
    },
  },
  {
    code: 'IT_STAFF',
    name: 'IT Staff',
    description: 'Operational access to IT division features',
    permissions: {
      dashboard: ['read'],
      master_item: ['read'],
      master_vendor: ['read'],
      inventory_type_item: ['read'],
      transaction_headset: ['create', 'read'],
      transaction_stockout: ['create', 'read'],
      purchase_request: [],
      delivery_order: [],
      vendor_submission: [],
      booking: ['create', 'read'],
      servis_asset: ['create', 'read'],
      log_ruang_server: ['create', 'read'],
      recording_review: ['create', 'read'],
      finding: ['create', 'read'],
      employee_data: [],
      leave_request: [],
      user_management: [],
      reporting: ['read'],
    },
  },
  {
    code: 'OPS_MANAGER',
    name: 'Ops Manager',
    description: 'Full access to Ops division features',
    permissions: {
      dashboard: ['read'],
      master_item: ['read'],
      master_vendor: ['read'],
      inventory_type_item: ['read'],
      transaction_headset: ['create', 'read', 'update', 'delete'],
      transaction_stockout: ['create', 'read', 'update', 'delete'],
      purchase_request: ['create', 'read', 'update', 'delete'],
      delivery_order: ['create', 'read', 'update', 'delete'],
      vendor_submission: ['create', 'read', 'update', 'delete'],
      booking: ['create', 'read', 'update', 'delete'],
      servis_asset: ['create', 'read', 'update', 'delete'],
      log_ruang_server: ['create', 'read', 'update', 'delete'],
      recording_review: ['create', 'read', 'update', 'delete'],
      finding: ['create', 'read', 'update', 'delete'],
      employee_data: [],
      leave_request: [],
      user_management: ['create', 'read', 'update', 'delete'],
      reporting: ['create', 'read', 'update', 'delete'],
    },
  },
  {
    code: 'OPS_SPV',
    name: 'Ops SPV',
    description: 'Supervisory access to Ops division features',
    permissions: {
      dashboard: ['read'],
      master_item: ['read'],
      master_vendor: ['read'],
      inventory_type_item: ['read'],
      transaction_headset: ['create', 'read', 'update'],
      transaction_stockout: ['create', 'read', 'update'],
      purchase_request: ['create', 'read', 'update'],
      delivery_order: ['create', 'read', 'update'],
      vendor_submission: ['create', 'read', 'update'],
      booking: ['create', 'read', 'update'],
      servis_asset: ['create', 'read', 'update'],
      log_ruang_server: ['create', 'read', 'update'],
      recording_review: ['create', 'read', 'update'],
      finding: ['create', 'read', 'update'],
      employee_data: [],
      leave_request: [],
      user_management: ['create', 'read', 'update'],
      reporting: ['create', 'read', 'update'],
    },
  },
  {
    code: 'OPS_LEADER',
    name: 'Ops Leader',
    description: 'Team lead access to Ops division features',
    permissions: {
      dashboard: ['read'],
      master_item: ['read'],
      master_vendor: ['read'],
      inventory_type_item: ['read'],
      transaction_headset: ['create', 'read', 'update'],
      transaction_stockout: ['create', 'read', 'update'],
      purchase_request: ['create', 'read', 'update'],
      delivery_order: ['create', 'read', 'update'],
      vendor_submission: ['create', 'read', 'update'],
      booking: ['create', 'read', 'update'],
      servis_asset: ['create', 'read', 'update'],
      log_ruang_server: ['create', 'read', 'update'],
      recording_review: ['create', 'read', 'update'],
      finding: ['create', 'read', 'update'],
      employee_data: [],
      leave_request: [],
      user_management: ['create', 'read', 'update'],
      reporting: ['create', 'read', 'update'],
    },
  },
  {
    code: 'OPS_AGENT',
    name: 'Ops Agent',
    description: 'Agent access to Ops division features',
    permissions: {
      dashboard: ['read'],
      master_item: [],
      master_vendor: [],
      inventory_type_item: [],
      transaction_headset: ['create', 'read'],
      transaction_stockout: ['create', 'read'],
      purchase_request: [],
      delivery_order: [],
      vendor_submission: [],
      booking: ['create', 'read'],
      servis_asset: ['create', 'read'],
      log_ruang_server: ['create', 'read'],
      recording_review: ['create', 'read'],
      finding: ['create', 'read'],
      employee_data: [],
      leave_request: [],
      user_management: [],
      reporting: [],
    },
  },
  {
    code: 'QC_SPV',
    name: 'QC SPV',
    description: 'Supervisory access to QC division features',
    permissions: {
      dashboard: ['read'],
      master_item: [],
      master_vendor: [],
      inventory_type_item: [],
      transaction_headset: ['create', 'read', 'update'],
      transaction_stockout: ['read'],
      purchase_request: [],
      delivery_order: [],
      vendor_submission: [],
      booking: ['create', 'read', 'update'],
      servis_asset: ['create', 'read', 'update'],
      log_ruang_server: ['create', 'read', 'update'],
      recording_review: ['create', 'read', 'update'],
      finding: ['create', 'read', 'update'],
      employee_data: [],
      leave_request: [],
      user_management: [],
      reporting: ['read'],
    },
  },
  {
    code: 'QC_STAFF',
    name: 'QC Staff',
    description: 'Staff access to QC division features',
    permissions: {
      dashboard: ['read'],
      master_item: [],
      master_vendor: [],
      inventory_type_item: [],
      transaction_headset: ['create', 'read'],
      transaction_stockout: ['read'],
      purchase_request: [],
      delivery_order: [],
      vendor_submission: [],
      booking: ['create', 'read'],
      servis_asset: ['create', 'read'],
      log_ruang_server: ['create', 'read'],
      recording_review: ['create', 'read'],
      finding: ['create', 'read'],
      employee_data: [],
      leave_request: [],
      user_management: [],
      reporting: [],
    },
  },
  {
    code: 'HR_MANAGER',
    name: 'HR Manager',
    description: 'Full access to HR division features',
    permissions: {
      dashboard: ['read'],
      master_item: [],
      master_vendor: [],
      inventory_type_item: [],
      transaction_headset: ['read'],
      transaction_stockout: ['read'],
      purchase_request: [],
      delivery_order: [],
      vendor_submission: [],
      booking: ['read'],
      servis_asset: ['read'],
      log_ruang_server: ['read'],
      recording_review: ['read'],
      finding: ['read'],
      employee_data: ['create', 'read', 'update', 'delete'],
      leave_request: ['create', 'read', 'update', 'delete'],
      user_management: ['read'],
      reporting: ['read'],
    },
  },
  {
    code: 'HR_STAFF',
    name: 'HR Staff',
    description: 'Staff access to HR division features',
    permissions: {
      dashboard: ['read'],
      master_item: [],
      master_vendor: [],
      inventory_type_item: [],
      transaction_headset: ['read'],
      transaction_stockout: ['read'],
      purchase_request: [],
      delivery_order: [],
      vendor_submission: [],
      booking: ['read'],
      servis_asset: ['read'],
      log_ruang_server: ['read'],
      recording_review: ['read'],
      finding: ['read'],
      employee_data: ['create', 'read', 'update'],
      leave_request: ['create', 'read', 'update'],
      user_management: [],
      reporting: [],
    },
  },
];

const DIVISIONS = [
  { code: 'IT', name: 'IT Division' },
  { code: 'OPS', name: 'Operations Division' },
  { code: 'QC', name: 'Quality Control Division' },
  { code: 'HR', name: 'Human Resources Division' },
  { code: 'FINANCE', name: 'Finance Division' },
  { code: 'MARKETING', name: 'Marketing Division' },
];

async function main() {
  console.log('Seeding database...');

  // 1. Create divisions
  for (const div of DIVISIONS) {
    await prisma.division.upsert({
      where: { code: div.code },
      update: { name: div.name },
      create: div,
    });
  }
  console.log(`Seeded ${DIVISIONS.length} divisions.`);

  // 2. Create roles
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description, permissions: role.permissions },
      create: role,
    });
  }
  console.log(`Seeded ${ROLES.length} roles.`);

  // 3. Create default users
  const users = [
    { username: 'superadmin', name: 'Sigit SuperAdmin', password: 'admin123', roleCode: 'SUPERADMIN', divisionCode: 'IT' },
    { username: 'it_manager', name: 'Andi IT Manager', password: 'manager123', roleCode: 'IT_MANAGER', divisionCode: 'IT' },
    { username: 'it_spv', name: 'Budi IT SPV', password: 'spv123', roleCode: 'IT_SPV', divisionCode: 'IT' },
    { username: 'it_staff', name: 'Dika IT Staff', password: 'staff123', roleCode: 'IT_STAFF', divisionCode: 'IT' },
    { username: 'ops_manager', name: 'Rina Ops Manager', password: 'manager123', roleCode: 'OPS_MANAGER', divisionCode: 'OPS' },
    { username: 'ops_spv', name: 'Joko Ops SPV', password: 'spv123', roleCode: 'OPS_SPV', divisionCode: 'OPS' },
    { username: 'ops_leader', name: 'Sari Ops Leader', password: 'leader123', roleCode: 'OPS_LEADER', divisionCode: 'OPS' },
    { username: 'ops_agent', name: 'Agus Ops Agent', password: 'agent123', roleCode: 'OPS_AGENT', divisionCode: 'OPS' },
    { username: 'qc_spv', name: 'Maya QC SPV', password: 'spv123', roleCode: 'QC_SPV', divisionCode: 'QC' },
    { username: 'qc_staff', name: 'Rudi QC Staff', password: 'staff123', roleCode: 'QC_STAFF', divisionCode: 'QC' },
    { username: 'hr_manager', name: 'Lina HR Manager', password: 'manager123', roleCode: 'HR_MANAGER', divisionCode: 'HR' },
    { username: 'hr_staff', name: 'Dodi HR Staff', password: 'staff123', roleCode: 'HR_STAFF', divisionCode: 'HR' },
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const role = await prisma.role.findUnique({ where: { code: u.roleCode } });
    const division = await prisma.division.findUnique({ where: { code: u.divisionCode } });

    if (!role || !division) {
      console.error(`Role ${u.roleCode} or Division ${u.divisionCode} not found`);
      continue;
    }

    await prisma.user.upsert({
      where: { username: u.username },
      update: { name: u.name, password: hashedPassword, roleId: role.id, divisionId: division.id },
      create: { username: u.username, name: u.name, password: hashedPassword, roleId: role.id, divisionId: division.id },
    });
  }
  console.log(`Seeded ${users.length} users.`);

  console.log('Seed complete.');
  console.log('\nDefault login credentials:');
  console.log('  superadmin / admin123 (SuperAdmin, IT)');
  console.log('  it_manager / manager123 (IT Manager, IT)');
  console.log('  it_spv / spv123 (IT SPV, IT)');
  console.log('  it_staff / staff123 (IT Staff, IT)');
  console.log('  ops_manager / manager123 (Ops Manager, OPS)');
  console.log('  ops_spv / spv123 (Ops SPV, OPS)');
  console.log('  ops_leader / leader123 (Ops Leader, OPS)');
  console.log('  ops_agent / agent123 (Ops Agent, OPS)');
  console.log('  qc_spv / spv123 (QC SPV, QC)');
  console.log('  qc_staff / staff123 (QC Staff, QC)');
  console.log('  hr_manager / manager123 (HR Manager, HR)');
  console.log('  hr_staff / staff123 (HR Staff, HR)');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
