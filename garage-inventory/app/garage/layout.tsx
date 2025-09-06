// app/garage/layout.tsx
export default function GarageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-6">Garage Inventory</h1>
      {children}
    </section>
  );
}
