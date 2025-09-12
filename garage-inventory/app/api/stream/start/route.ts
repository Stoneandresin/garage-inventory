import { NextResponse } from 'next/server';
import { createSession } from '@/lib/sessionStore';

export async function POST() {
  const { id, token } = createSession();
  const body: any = { session_id: id };
  if (token) {
    body.ingest_token = token;
  }
  return NextResponse.json(body);
}
