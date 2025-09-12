import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Item } from '@/lib/models';

// GET /api/items
// Supports optional `q` query for fuzzy search and optional `limit` to restrict
// the number of results (default 50). Performs a case‑insensitive search on
// item names and aliases, combining results without duplicates.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const limit = Number(searchParams.get('limit') || '50');
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
      type Alias = { item_id: string; alias: string };
      const aliasIds = (aliasResults.data || []).map((a: Alias) => a.item_id);
      const aliasItems = aliasIds.length
        ? await supabaseAdmin
            .from('items')
            .select('id,name,category,confidence')
            .in('id', aliasIds)
            .limit(limit)
        : { data: [] as Item[] };
      const nameItems: Item[] = (nameResults.data ?? []) as Item[];
      const aliasItemsData: Item[] = (aliasItems.data ?? []) as Item[];
      const dedup = new Map<string, Item>();
      nameItems.forEach((r) => dedup.set(r.id, r));
      aliasItemsData.forEach((r) => dedup.set(r.id, r));
      return NextResponse.json({ items: Array.from(dedup.values()).slice(0, limit) });
    }
    // No query; return recent items
    const { data, error } = await supabaseAdmin
      .from('items')
      .select('id,name,category,confidence')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return NextResponse.json({ items: (data ?? []) as Item[] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'items_fetch_failed' }, { status: 500 });
  }
}