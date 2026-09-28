import { Role } from './rbac';

export interface UserSession {
  id: number;
  username: string;
  name: string;
  role: Role;
  vendorId?: number | null;
}

export const DEMO_USERS: UserSession[] = [
  {
    id: 1,
    username: 'superadmin',
    name: 'Sigit SuperAdmin IT',
    role: 'SUPERADMIN',
  },
  {
    id: 2,
    username: 'spv',
    name: 'Budi SPV IT',
    role: 'SPV',
  },
  {
    id: 3,
    username: 'staff',
    name: 'Dika IT Staff',
    role: 'STAFF',
  },
  {
    id: 4,
    username: 'vendor',
    name: 'Swapro Vendor Rep',
    role: 'VENDOR',
    vendorId: 1,
  },
];
