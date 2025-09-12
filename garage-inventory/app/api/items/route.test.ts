import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.com';
process.env.SUPABASE_SERVICE_KEY = 'key';

async function run() {
  const { GET } = await import('./route');
  const highRes = await GET({ url: 'http://example.com/api/items?limit=101' } as any);
  assert.equal(highRes.status, 400);

  const lowRes = await GET({ url: 'http://example.com/api/items?limit=0' } as any);
  assert.equal(lowRes.status, 400);

  console.log('limit range enforcement tests passed');
}

run();
