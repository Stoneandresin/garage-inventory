import { NextRequest, NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/sessionStore';

export async function POST(req: NextRequest) {
  try {
    const { session_id, ingest_token } = await req.json();
    const session = getSession(session_id);
    if (!session) {
      return NextResponse.json({ error: 'invalid_session' }, { status: 404 });
    }
    if (session.token && session.token !== ingest_token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    deleteSession(session_id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'stop_failed' }, { status: 500 });
  }
}
