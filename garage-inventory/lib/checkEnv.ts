const required = [
  'NEXT_PUBLIC_CLOUDINARY_PRESET',
  'NEXT_PUBLIC_INGEST_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}
