import { NextRequest, NextResponse } from 'next/server';
import { Role, Feature, Action, hasPermission } from './rbac';

// Demo users with roles for server-side auth check
// In production, this should be replaced with real session/JWT validation
const DEMO_USERS: { username: string; role: Role }[] = [
  { username: 'superadmin', role: 'SUPERADMIN' },
  { username: 'manager_ops', role: 'MANAGER_OPS' },
  { username: 'spv_ops', role: 'SPV_OPS' },
  { username: 'leader_ops', role: 'LEADER_OPS' },
  { username: 'agen', role: 'AGEN' },
  { username: 'spv_qc', role: 'SPV_QC' },
  { username: 'staff_qc', role: 'STAFF_QC' },
  { username: 'spv_hr', role: 'SPV_HR' },
  { username: 'staff_hr', role: 'STAFF_HR' },
];

export interface AuthContext {
  username: string;
  role: Role;
}

/**
 * Extract auth context from request.
 * For demo purposes, reads from 'x-user' header or 'demo_user' query param.
 * In production, replace with JWT/session validation.
 */
export function getAuthContext(req: NextRequest): AuthContext | null {
  // Check header first (for API calls from the app)
  const headerUser = req.headers.get('x-user');
  if (headerUser) {
    const found = DEMO_USERS.find((u) => u.username === headerUser);
    if (found) return found;
  }

  // Check query param (for direct API access)
  const queryUser = req.nextUrl.searchParams.get('demo_user');
  if (queryUser) {
    const found = DEMO_USERS.find((u) => u.username === queryUser);
    if (found) return found;
  }

  return null;
}

/**
 * Check if the request has permission to perform an action on a feature.
 * Returns null if authorized, or a NextResponse with error if not.
 */
export function requirePermission(
  req: NextRequest,
  feature: Feature,
  action: Action
): NextResponse | null {
  const auth = getAuthContext(req);

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized. Login terlebih dahulu.' },
      { status: 401 }
    );
  }

  if (!hasPermission(auth.role, feature, action)) {
    return NextResponse.json(
      { error: `Forbidden. Role ${auth.role} tidak memiliki izin ${action} pada ${feature}.` },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Get auth context or return error response.
 */
export function requireAuth(req: NextRequest): { auth: AuthContext } | { error: NextResponse } {
  const auth = getAuthContext(req);
  if (!auth) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized. Login terlebih dahulu.' },
        { status: 401 }
      ),
    };
  }
  return { auth };
}
