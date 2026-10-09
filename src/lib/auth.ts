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
  { id: 2, username: 'it_manager', name: 'Andi IT Manager', role: 'SPV_OPS', division: 'IT' },
  { id: 3, username: 'it_leader', name: 'Budi IT Leader', role: 'LEADER_OPS', division: 'IT' },
  { id: 4, username: 'it_staff', name: 'Dika IT Staff', role: 'AGEN', division: 'IT' },
];
