import { Role } from './rbac';

export interface UserSession {
  id: number;
  username: string;
  name: string;
  role: Role;
  division?: string | null;
  vendorId?: number | null;
}

export const DEMO_USERS: UserSession[] = [
  { id: 1, username: 'superadmin', name: 'Sigit SuperAdmin', role: 'SUPERADMIN', division: null },
  { id: 2, username: 'manager_ops', name: 'Budi Manager Ops', role: 'MANAGER_OPS', division: 'OPS' },
  { id: 3, username: 'spv_ops', name: 'Dika SPV Ops', role: 'SPV_OPS', division: 'OPS' },
  { id: 4, username: 'leader_ops', name: 'Rian Leader Ops', role: 'LEADER_OPS', division: 'OPS' },
  { id: 5, username: 'agen', name: 'Faisal Agen', role: 'AGEN', division: 'OPS' },
  { id: 6, username: 'spv_qc', name: 'Sari SPV QC', role: 'SPV_QC', division: 'QC' },
  { id: 7, username: 'staff_qc', name: 'Andi Staff QC', role: 'STAFF_QC', division: 'QC' },
  { id: 8, username: 'spv_hr', name: 'Rina SPV HR', role: 'SPV_HR', division: 'HR' },
  { id: 9, username: 'staff_hr', name: 'Dodi Staff HR', role: 'STAFF_HR', division: 'HR' },
];
