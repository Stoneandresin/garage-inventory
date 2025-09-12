'use client';

export default function GarageError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error(error);
  return (
    <div className="p-4">
      <h2>Something went wrong in the garage.</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
