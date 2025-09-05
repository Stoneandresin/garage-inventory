# Garage Inventory Application

This project is a minimal web application for cataloguing items in a garage or storage space using a mobile‑first workflow. Users capture photos of messy shelves or bins, and the app uses an LLM vision model to detect and categorise the visible items. Detected items are persisted in a Supabase database along with bounding boxes to aid in locating them later. A simple search interface allows you to browse your inventory.

## Features

- **Photo upload** via Cloudinary – supports drag/drop or camera capture on mobile.
- **Multi‑object detection** using OpenAI's vision model (`gpt-4o-mini`) with a constrained taxonomy.
- **Supabase persistence** for photos, items, bounding boxes and locations.
- **Search and list** items by name, alias or category.
- **Lightweight API** suitable for reuse in an iOS/Android wrapper later.

## Setup

1. **Clone the repo** and install dependencies:

   ```bash
   pnpm install
   ```

2. **Configure environment variables** by copying `.env.example` to `.env.local` and filling in the values for your Supabase project, OpenAI key and Cloudinary preset.

3. **Create the database schema** in Supabase. Run the following SQL in the SQL editor for your project (replace `<project-ref>` with your actual ref):

   ```sql
   -- enable trigram index
   create extension if not exists pg_trgm;

   -- photos table
   create table if not exists photos (
     id uuid primary key default gen_random_uuid(),
     url text not null,
     width int,
     height int,
     phash text,
     captured_at timestamptz not null default now(),
     raw_tags jsonb
   );

   -- items table
   create table if not exists items (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     category text not null,
     quantity int not null default 1,
     confidence real,
     notes text,
     created_at timestamptz not null default now()
   );

   -- aliases
   create table if not exists item_aliases (
     id uuid primary key default gen_random_uuid(),
     item_id uuid not null references items(id) on delete cascade,
     alias text not null
   );

   -- item ↔ photo mapping (with bounding boxes)
   create table if not exists item_photos (
     item_id uuid not null references items(id) on delete cascade,
     photo_id uuid not null references photos(id) on delete cascade,
     bbox jsonb,
     primary key (item_id, photo_id)
   );

   -- hierarchical locations (e.g. Wall A -> Shelf 2 -> Bin 3)
   create table if not exists locations (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     parent_id uuid references locations(id) on delete set null
   );

   create table if not exists item_locations (
     item_id uuid not null references items(id) on delete cascade,
     location_id uuid not null references locations(id) on delete cascade,
     primary key (item_id, location_id)
   );

   -- indexes for faster search
   create index if not exists idx_items_name_trgm on items using gin (name gin_trgm_ops);
   create index if not exists idx_items_category on items (category);
   create index if not exists idx_aliases_trgm on item_aliases using gin (alias gin_trgm_ops);

   -- enable RLS
   alter table photos enable row level security;
   alter table items enable row level security;
   alter table item_aliases enable row level security;
   alter table item_photos enable row level security;
   alter table locations enable row level security;
   alter table item_locations enable row level security;

   -- allow all operations for service role
   create policy "srv all on photos" on photos for all using (true) with check (true);
   create policy "srv all on items" on items for all using (true) with check (true);
   create policy "srv all on item_aliases" on item_aliases for all using (true) with check (true);
   create policy "srv all on item_photos" on item_photos for all using (true) with check (true);
   create policy "srv all on locations" on locations for all using (true) with check (true);
   create policy "srv all on item_locations" on item_locations for all using (true) with check (true);

   -- (optional) public read policies if you want to fetch with the anon key
   create policy "public read photos" on photos for select using (true);
   create policy "public read items" on items for select using (true);
   create policy "public read item_aliases" on item_aliases for select using (true);
   create policy "public read item_photos" on item_photos for select using (true);
   create policy "public read locations" on locations for select using (true);
   create policy "public read item_locations" on item_locations for select using (true);
   ```

4. **Run the development server**:

   ```bash
   pnpm dev
   ```

5. Navigate to `http://localhost:3000/garage` to try uploading photos and searching items.

## Deployment

Deploy this app to Vercel and add the environment variables from `.env.local` in the Vercel project settings. The endpoints under `/api` work with the default Server Actions in Next.js 14. For production, ensure you include a secure `INGEST_TOKEN` and provide it in the `Authorization` header when calling `/api/ingest` from the client.

## Contributing

Pull requests and improvements are welcome! If you add new item categories or features (like QR code labelling, SMS alerts, or a mobile wrapper), please document the changes and update the instructions accordingly.