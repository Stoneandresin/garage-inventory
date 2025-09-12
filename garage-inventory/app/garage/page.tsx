import GarageCapture from '@/components/GarageCapture';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GaragePage({ searchParams }: { searchParams: { q?: string } }) {
  async function fetchItems(query?: string) {
    const headersList = headers();
    const host = headersList.get('host') ?? 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') ?? 'http';
    const baseUrl = `${protocol}://${host}`;
    const url = query
      ? `${baseUrl}/api/items?q=${encodeURIComponent(query)}`
      : `${baseUrl}/api/items`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        console.error('Failed to fetch items', res.status, res.statusText);
        return { items: [] };
      }
      return res.json();
    } catch (err) {
      console.error('Error fetching items', err);
      return { items: [] };
    }
  }

  const data = await fetchItems(searchParams?.q);
  const items = data.items ?? [];

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-semibold">Garage Inventory</h1>
      <GarageCapture />
      <form action="/garage" className="flex gap-2">
        <input
          type="text"
          name="q"
          placeholder="Search"
          defaultValue={searchParams.q}
          className="border p-2 flex-grow"
        />
        <button type="submit" className="bg-blue-500 text-white p-2">
          Search
        </button>
      </form>
      {items.length === 0 && (
        <p className="text-gray-500">No items found.</p>
      )}
      {items.map((it: any) => (
        <div key={it.id} className="border p-2">
          <p className="font-semibold">{it.name}</p>
          <p className="text-sm text-gray-600">
            {it.category} · conf {typeof it.confidence === 'number' ? it.confidence.toFixed(2) : '-'}
          </p>
        </div>
      ))}
    </div>
  );
}
