import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession, sessionCookieOptions, SESSION_COOKIE, coercePermissions } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? '').trim();
    const password = String(body?.password ?? '');

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true, division: true },
    });

    // Selalu jalankan bcrypt.compare agar waktu respons tidak membocorkan
    // apakah username terdaftar atau tidak.
    const hash = user?.password ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';
    const isValid = await bcrypt.compare(password, hash);

    if (!user || !isValid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    // Rotasi sesi: token lama dihapus, token baru diterbitkan (anti session fixation).
    const { token } = await createSession(user.id, {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for'),
    });

    const res = NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role.code,
      roleName: user.role.name,
      division: user.division.name,
      divisionCode: user.division.code,
      permissions: coercePermissions(user.role.permissions),
    });

    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(request));
    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}