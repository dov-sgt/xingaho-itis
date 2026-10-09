import { NextResponse } from 'next/server';

/**
 * Helper respons JSON.
 *
 * `charset=utf-8` ditulis eksplisit karena sebagian browser/proxy
 * menebak charset respons JSON sebagai Latin-1. Tanpa itu, teks non-ASCII dari
 * database (mis. nama karyawan beraksen) bisa tampil salah di layar.
 */
function json(data: any, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function ok(data: any, status = 200) {
  return json(data, status);
}

export function badRequest(message: string) {
  return json({ error: message }, 400);
}

export function unauthorized(message = 'Unauthorized') {
  return json({ error: message }, 401);
}

export function forbidden(message = 'Forbidden') {
  return json({ error: message }, 403);
}

export function notFound(message = 'Data tidak ditemukan') {
  return json({ error: message }, 404);
}

export function serverError(message = 'Internal server error') {
  return json({ error: message }, 500);
}

export function validationError(errors: string[]) {
  return json({ error: 'Validasi gagal', details: errors }, 400);
}
