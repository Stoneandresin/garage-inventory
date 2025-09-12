import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// GET /api/items
// Supports optional `q` query for fuzzy search and optional `limit` to restrict
// the number of results (default 50). Performs a case‑insensitive search on
// item names and aliases, combining results without duplicates.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const limit = Number(searchParams.get('limit') || '50');
  try {
    const supabase = getSupabaseAdmin();
    if (query) {
      const nameResults = await supabase
        .from('items')
        .select('id,name,category,confidence')
        .ilike('name', `%${query}%`)
        .limit(limit);
      const aliasResults = await supabase
        .from('item_aliases')
        .select('item_id,alias')
        .ilike('alias', `%${query}%`)
        .limit(limit);
      const aliasIds = (aliasResults.data || []).map((a: any) => a.item_id);
      const aliasItems = aliasIds.length
        ? await supabase
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
    const { data, error } = await supabase
      .from('items')
      .select('id,name,category,confidence')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error('GET /api/items error:', err);
    return NextResponse.json({ error: err.message || 'items_fetch_failed' }, { status: 500 });
  }
}