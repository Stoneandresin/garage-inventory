import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateSession } from '@/lib/sessionStore';

// Simple streaming ingest endpoint. Accepts binary chunks uploaded from the
// client and returns the current queue depth. For now, the chunks are simply
// consumed and discarded.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'missing_session' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!validateSession(sessionId, token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // Read the uploaded chunk into a buffer.
    const chunk = Buffer.from(await req.arrayBuffer());

    // Store the chunk in the `stream` storage bucket with a random name. The
    // bucket is expected to exist ahead of time.
    const fileName = `${randomUUID()}.webm`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('stream')
      .upload(fileName, chunk, {
        contentType: 'video/webm',
        upsert: false,
      });
    if (uploadErr) {
      throw new Error(uploadErr.message);
    }

    // Count how many chunks currently exist to approximate queue depth.
    const { data: files, error: listErr } = await supabaseAdmin.storage
      .from('stream')
      .list();
    if (listErr) {
      throw new Error(listErr.message);
    }

    const queued = files?.length ?? 0;
    return NextResponse.json({ queued });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'ingest_failed' }, { status: 500 });
  }
}
