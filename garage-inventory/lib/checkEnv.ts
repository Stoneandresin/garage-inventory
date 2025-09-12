const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];

const recommended = [
  'NEXT_PUBLIC_CLOUDINARY_PRESET',
  'NEXT_PUBLIC_INGEST_KEY',
  'INGEST_TOKEN',
  'OPENAI_API_KEY',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

for (const name of recommended) {
  if (!process.env[name]) {
    console.warn(`Missing environment variable: ${name}`);
  }
}
