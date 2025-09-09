import GarageCapture from '@/components/GarageCapture';

export default async function GaragePage({ searchParams }: { searchParams: { q?: string } }) {
  async function fetchItems(query?: string) {
   // baseUrl set to empty string so relative API calls work in all environments.
   const baseUrl = '';
 const url = query
      ? `${baseUrl}/api/items?q=${encodeURIComponent(query)}`
      : `${baseUrl}/api/items`;
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
      {data.items?.map((it: any) => (
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
