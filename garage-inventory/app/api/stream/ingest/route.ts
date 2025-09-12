import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAuth } from '@/lib/validateAuth';

// Maximum accepted payload size (bytes). Reject anything larger upfront.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Simple streaming ingest endpoint. Accepts binary chunks uploaded from the
// client and returns the current queue depth. For now, the chunks are simply
// consumed and discarded.
export async function POST(req: NextRequest) {
  const unauthorized = validateAuth(req.headers);
  if (unauthorized) return unauthorized;

  try {
    // Enforce payload size using Content-Length if provided.
    const lenHeader = req.headers.get('content-length');
    if (lenHeader) {
      const len = Number(lenHeader);
      if (isNaN(len) || len > MAX_BYTES) {
        return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
      }
    }

    // Ensure the request actually has a body.
    if (!req.body) {
      return NextResponse.json({ error: 'missing_body' }, { status: 400 });
    }

    // Stream the request body, aborting if it exceeds MAX_BYTES.
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        if (received > MAX_BYTES) {
          return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const chunk = Buffer.concat(chunks);

    // Store the chunk in the `stream` storage bucket with a random name.
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

    // Increment and return queue depth without listing the bucket.
    const { data: meta, error: metaErr } = await supabaseAdmin
      .from('stream_queue')
      .select('count')
      .eq('id', 'stream')
      .single();
    let queued = (meta?.count ?? 0) + 1;
    const { error: upsertErr } = await supabaseAdmin
      .from('stream_queue')
      .upsert({ id: 'stream', count: queued });
    if (metaErr && metaErr.code !== 'PGRST116') {
      throw new Error(metaErr.message);
    }
    if (upsertErr) {
      throw new Error(upsertErr.message);
    }

    return NextResponse.json({ queued });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'ingest_failed' }, { status: 500 });
  }
}
