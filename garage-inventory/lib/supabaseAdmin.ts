import { createClient } from '@supabase/supabase-js';

// This helper instantiates a Supabase client for server‑side usage. It
// relies on the service role key, which should only ever be used on the
// server (never exposed to the client). See `.env.example` for the
// required environment variables. You can import this client in API
// routes or server components to interact with your database.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});