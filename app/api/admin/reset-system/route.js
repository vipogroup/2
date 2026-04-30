import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      error: 'deprecated_endpoint',
      message: 'Use app/api/admin/system-reset/route.js instead.',
    },
    { status: 410 },
  );
}
