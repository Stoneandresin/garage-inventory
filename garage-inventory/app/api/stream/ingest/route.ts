import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Simple streaming ingest endpoint. Accepts binary chunks uploaded from the
// client and returns the current queue depth. For now, the chunks are simply
// consumed and discarded.
export async function POST(req: NextRequest) {
  // Optional bearer token gate; reuse INGEST_TOKEN if set.
  const expectedToken = process.env.INGEST_TOKEN;
  if (expectedToken) {
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseAdmin();
    // Read the uploaded chunk into a buffer.
    const chunk = Buffer.from(await req.arrayBuffer());

    // Store the chunk in the `stream` storage bucket with a random name. The
    // bucket is expected to exist ahead of time.
    const fileName = `${randomUUID()}.webm`;
    const { error: uploadErr } = await supabase.storage
      .from('stream')
      .upload(fileName, chunk, {
        contentType: 'video/webm',
        upsert: false,
      });
    if (uploadErr) {
      throw new Error(uploadErr.message);
    }

    // Count how many chunks currently exist to approximate queue depth.
    const { data: files, error: listErr } = await supabase.storage
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
