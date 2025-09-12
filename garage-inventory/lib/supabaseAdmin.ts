import { createClient } from '@supabase/supabase-js';

/**
 * Returns a Supabase client using the service role key. The client is created
 * at call time so that environment variables are only read during a request
 * and never during build time.
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    // Helpful error for logs / development
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch },
  });
}

