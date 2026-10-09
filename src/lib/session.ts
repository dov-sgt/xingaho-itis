import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  Action,
  PermissionMap,
  hasPermissionIn,
  canAccessMenuIn,
  isSuperAdmin,
} from './rbac';

export const SESSION_COOKIE = 'xh_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 jam

export interface AuthContext {
  userId: number;
  username: string;
  name: string;
  role: string;
  roleName: string;
  division: string;
  divisionCode: string;
  vendorId: number | null;
  permissions: PermissionMap;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Coerce whatever is in Role.permissions into a usable map. */
export function coercePermissions(raw: unknown): PermissionMap {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return coercePermissions(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw as PermissionMap;
  return {};
}

/**
 * Flag `Secure` cookie harus mengikuti skema ASLI request, bukan `NODE_ENV`.
 *
 * Aplikasi ini produksi-nya berjalan di HTTP biasa (http://192.168.52.140:3005).
 * Browser **menolak** menyimpan & mengirim cookie `Secure` lewat HTTP, sehingga
 * memakai `NODE_ENV === 'production'` membuat session ikut terbuang di setiap
 * request -> "Sesi tidak valid atau sudah berakhir".
 *
 * `COOKIE_SECURE=true` untuk memaksa HTTPS (mis. di belakang reverse proxy).
 */
export function isHttpsRequest(req?: NextRequest): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (!req) return false;
  const forwarded = req.headers.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0].trim() === 'https';
  return req.nextUrl.protocol === 'https:';
}

export function sessionCookieOptions(req?: NextRequest) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttpsRequest(req),
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/**
 * Create a fresh session for a user.
 *
 * Any pre-existing session belonging to that user is deleted first so a
 * stale token can never be reused after a re-login (session fixation guard),
 * and the browser cookie is rotated with a brand new token.
 */
export async function createSession(
  userId: number,
  meta: { userAgent?: string | null; ip?: string | null } = {},
) {
  await prisma.session.deleteMany({ where: { userId } });

  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      token: hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    },
  });

  return { token, expiresAt };
}

export async function destroySession(token: string | undefined | null) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token: hashToken(token) } });
}

function readToken(req: NextRequest): string | null {
  // HttpOnly cookie is the primary channel. The header is kept as a fallback
  // for non-browser callers (curl / server-to-server) and is never exposed to
  // client-side JavaScript.
  const fromCookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  const fromHeader = req.headers.get('x-session');
  if (fromHeader) return fromHeader;
  return null;
}

/**
 * Resolve the authenticated user for a request straight from the database.
 * Returns null for missing / unknown / expired sessions.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const token = readToken(req);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: { include: { role: true, division: true } } },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const u = session.user;
  return {
    userId: u.id,
    username: u.username,
    name: u.name,
    role: u.role.code,
    roleName: u.role.name,
    division: u.division.name,
    divisionCode: u.division.code,
    vendorId: u.vendorId,
    permissions: coercePermissions(u.role.permissions),
  };
}

/** True when the authenticated role holds the action on the feature. */
export function authHasPermission(
  auth: AuthContext,
  feature: string,
  action: Action,
): boolean {
  if (isSuperAdmin(auth.role)) return true;
  return hasPermissionIn(auth.permissions, feature, action);
}

export function authCanAccessMenu(auth: AuthContext, feature: string): boolean {
  if (isSuperAdmin(auth.role)) return true;
  return canAccessMenuIn(auth.permissions, feature);
}

/**
 * Guard for API routes. Returns `null` when the caller is allowed to proceed,
 * otherwise a ready-to-return error response (401 / 403).
 */
export async function requirePermission(
  req: NextRequest,
  feature: string,
  action: Action,
): Promise<NextResponse | null> {
  const auth = await getAuthContext(req);

  if (!auth) return sessionEndedResponse(null);

  if (!authHasPermission(auth, feature, action)) {
    return NextResponse.json(
      {
        error: `Akses ditolak. Role ${auth.roleName} tidak memiliki izin "${action}" pada modul ${feature}.`,
        role: auth.role,
        feature,
        action,
      },
      { status: 403 },
    );
  }

  return null;
}

export type RequireAuthResult =
  | { auth: AuthContext; error?: undefined }
  | { auth?: undefined; error: NextResponse };

/**
 * Pesan error 401 yang ramah.
 * Bedakan "belum login" dari "sesi benar-benar habis" supaya UI tidak
 * complained "sesi berakhir" padahal user sebenarnya belum pernah login.
 */
export function sessionEndedResponse(auth?: AuthContext | null): NextResponse {
  const firstTime = !auth;
  return NextResponse.json(
    {
      error: firstTime
        ? 'Anda belum login. Silakan masuk terlebih dahulu.'
        : 'Sesi Anda sudah berakhir. Silakan login kembali.',
      code: firstTime ? 'NO_SESSION' : 'SESSION_EXPIRED',
    },
    { status: 401 },
  );
}

/**
 * Guard yang menerima salah satu dari beberapa feature.
 * Dipakai untuk endpoint yang dibutuhkan lebih dari satu modul (mis. daftar
 * role/divisi yang dipakai oleh form User Management maupun Role Management).
 */
export async function requireAnyPermission(
  req: NextRequest,
  options: { feature: string; action: Action }[],
): Promise<NextResponse | null> {
  const auth = await getAuthContext(req);
  if (!auth) return sessionEndedResponse(null);

  if (options.some((o) => authHasPermission(auth, o.feature, o.action))) return null;

  return NextResponse.json(
    {
      error: `Akses ditolak. Role ${auth.roleName} tidak memiliki izin "${options[0]?.action}" pada modul ${options
        .map((o) => o.feature)
        .join(' / ')}.`,
    },
    { status: 403 },
  );
}

export async function requireAuth(req: NextRequest): Promise<RequireAuthResult> {
  const auth = await getAuthContext(req);
  if (!auth) return { error: sessionEndedResponse(null) };
  return { auth };
}

/** Restrict an endpoint to SuperAdmin only (Role / Division / User management). */
export async function requireSuperAdmin(req: NextRequest): Promise<RequireAuthResult> {
  const result = await requireAuth(req);
  if (result.error) return result;

  if (!isSuperAdmin(result.auth.role)) {
    return {
      error: NextResponse.json(
        { error: 'Hanya SuperAdmin yang dapat mengakses fitur ini.' },
        { status: 403 },
      ),
    };
  }

  return result;
}

/**
 * Guard SuperAdmin dengan bentuk return yang sama seperti `requirePermission`:
 * `null` bila lolos, atau respons error siap kirim.
 */
export async function requireSuperAdminPermission(req: NextRequest): Promise<NextResponse | null> {
  const result = await requireSuperAdmin(req);
  return result.error ?? null;
}