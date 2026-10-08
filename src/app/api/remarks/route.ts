import { NextResponse } from 'next/server';
import { ok, serverError } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Remark model not in schema - return empty for now
    const remarks: any[] = [];
    return ok(remarks);
  } catch (error: any) { return serverError(error.message); }
}
