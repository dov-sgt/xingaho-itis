import { NextResponse } from 'next/server';
import { ok, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Placeholder - implement with actual model when needed
    const nasabah: any[] = [];
    return ok(nasabah);
  } catch (error: any) { return serverError(error.message); }
}
