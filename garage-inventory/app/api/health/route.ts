import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
  const ok = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}

