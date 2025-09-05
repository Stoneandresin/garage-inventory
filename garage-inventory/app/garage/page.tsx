import GarageCapture from '@/components/GarageCapture';

/**
 * The main page for managing your garage inventory. Displays a capture
 * component and a simple search form. Recent or matching items are listed
 * below. This is a server component; it fetches data on the server via
 * `/api/items` and streams the result to the client. It uses no client
 * side state beyond the search input.
 */
export default async function GaragePage({ searchParams }: { searchParams: { q?: string } }) {
  async function fetchItems(query?: string) {
    const url = query ? `/api/items?q=${encodeURIComponent(query)}` : '/api/items';
    const res = await fetch(url, { cache: 'no-store' });
    return res.json();
  }
  const data = await fetchItems(searchParams?.q);
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-semibold">Garage Inventory</h1>
      <GarageCapture />
      <form action="/garage" className="flex gap-2">
        <input
          name="q"
          placeholder="Search items…"
          className="border rounded px-3 py-2 w-full"
          defaultValue={searchParams?.q || ''}
        />
        <button type="submit" className="border rounded px-4 py-2">Search</button>
      </form>
      <ul className="divide-y">
        {data.items?.map((it: any) => (
          <li key={it.id} className="py-2">
            <div className="text-sm font-medium">{it.name}</div>
            <div className="text-xs text-gray-500">
              {it.category} · conf {typeof it.confidence === 'number' ? it.confidence.toFixed(2) : '-'}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}