import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { CATEGORIES, Category } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Define the shape of a detected item returned from the vision model.
interface DetectedItem {
  name: string;
  category: Category;
  confidence: number;
  bbox?: { x: number; y: number; w: number; h: number };
}

// POST /api/ingest
export async function POST(req: NextRequest) {
  // Optional bearer token gate; if INGEST_TOKEN is set, clients must include it
  const expectedToken = process.env.INGEST_TOKEN;
  if (expectedToken) {
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseAdmin();
    const { imageUrl, publicId, width, height } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });
    }
    // Save the photo record
    const { data: photo, error: photoErr } = await supabase
      .from('photos')
      .insert({ url: imageUrl, width, height })
      .select()
      .single();
    if (photoErr) {
      throw new Error(photoErr.message);
    }
    // Detect items via the vision model
    const items = await detectItems(imageUrl);
    // Upsert each item and link it to the photo
    for (const it of items) {
      // See if an item with same name and category already exists
      const { data: existing } = await supabase
        .from('items')
        .select('id')
        .eq('category', it.category)
        .ilike('name', it.name)
        .limit(1)
        .maybeSingle();
      let itemId = existing?.id as string | undefined;
      if (!itemId) {
        const { data: created, error: createErr } = await supabase
          .from('items')
          .insert({ name: it.name, category: it.category, confidence: it.confidence })
          .select()
          .single();
        if (createErr) continue;
        itemId = created.id;
      }
      // Link the item to the photo with its bounding box
      await supabase.from('item_photos').insert({
        item_id: itemId,
        photo_id: photo.id,
        bbox: it.bbox ?? null,
      });
    }
    return NextResponse.json({ ok: true, detected: items.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'ingest_failed' }, { status: 500 });
  }
}

/**
 * Calls the OpenAI vision model to extract a list of items from an image. The
 * system prompt constrains the output to a strict JSON format and a fixed
 * category taxonomy. If the call fails or the JSON cannot be parsed, an
 * empty array is returned.
 */
async function detectItems(imageUrl: string): Promise<DetectedItem[]> {
  const systemPrompt = `Extract distinct, physical GARAGE items from the photo.\nReturn a JSON: {"items":[{"name":string,"category":one of ${JSON.stringify(
    CATEGORIES
  )},"confidence":0..1,"bbox":{"x":0..1,"y":0..1,"w":0..1,"h":0..1}}]}\nRules:\n- Prefer concrete names (e.g. "cordless impact driver", "50ft extension cord").\n- Merge duplicates; skip trash/packaging.\n- Only include items visible enough to retrieve later.`;
  try {
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) throw new Error('OpenAI API key missing');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Detect items and return strict JSON.' },
              { type: 'input_image', image_url: imageUrl },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    const data = await res.json();
    let items: DetectedItem[] = [];
    try {
      const payload = JSON.parse(data?.choices?.[0]?.message?.content ?? '{}');
      items = Array.isArray(payload?.items) ? payload.items : [];
    } catch {
      items = [];
    }
    // Filter out items with invalid categories
    const valid = new Set(CATEGORIES);
    return items.filter((it) => valid.has(it.category));
  } catch {
    return [];
  }
}