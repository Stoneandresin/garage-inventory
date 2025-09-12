import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/items
// Supports optional `q` query for fuzzy search and optional `limit` to restrict
// the number of results (default 50). Performs a case‑insensitive search on
// item names and aliases, combining results without duplicates.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  const rawLimit = searchParams.get('limit');
  let limit = 50;
  if (rawLimit !== null) {
    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed)) {
      limit = 50;
    } else {
      const clamped = Math.min(Math.max(parsed, 1), 100);
      if (clamped !== parsed) {
        return NextResponse.json({ error: 'limit_out_of_range' }, { status: 400 });
      }
      limit = clamped;
    }
  }
  try {
    if (query) {
      const nameResults = await supabaseAdmin
        .from('items')
        .select('id,name,category,confidence')
        .ilike('name', `%${query}%`)
        .limit(limit);
      const aliasResults = await supabaseAdmin
        .from('item_aliases')
        .select('item_id,alias')
        .ilike('alias', `%${query}%`)
        .limit(limit);
      const aliasIds = (aliasResults.data || []).map((a: any) => a.item_id);
      const aliasItems = aliasIds.length
        ? await supabaseAdmin
            .from('items')
            .select('id,name,category,confidence')
            .in('id', aliasIds)
            .limit(limit)
        : { data: [] as any[] };
      const dedup = new Map<string, any>();
      (nameResults.data || []).forEach((r: any) => dedup.set(r.id, r));
      (aliasItems.data || []).forEach((r: any) => dedup.set(r.id, r));
      return NextResponse.json({ items: Array.from(dedup.values()).slice(0, limit) });
    }
    // No query; return recent items
    const { data, error } = await supabaseAdmin
      .from('items')
      .select('id,name,category,confidence')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'items_fetch_failed' }, { status: 500 });
  }
}