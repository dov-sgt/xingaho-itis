import { NextResponse, NextRequest } from 'next/server';
import { destroySession, SESSION_COOKIE, getAuthContext } from '@/lib/session';

/** Sesi saat ini - dipakai client untuk memastikan cookie masih valid. */
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Tidak ada sesi aktif' }, { status: 401 });
  }
  return NextResponse.json({
    id: auth.userId,
    username: auth.username,
    name: auth.name,
    role: auth.role,
    roleName: auth.roleName,
    division: auth.division,
    divisionCode: auth.divisionCode,
    permissions: auth.permissions,
  });
}

/** Logout - hapus sesi di server dan kosongkan cookie. */
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? req.headers.get('x-session');
  await destroySession(token);

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}