"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';

const CldUploadWidget = dynamic(() => import('next-cloudinary').then(m => m.CldUploadWidget), {
  ssr: false,
});

/**
 * GarageCapture provides a button that opens a Cloudinary upload widget. On
 * successful upload, it posts the image URL to `/api/ingest` to trigger
 * detection and persistence. Feedback is displayed below the button.
 */
export default function GarageCapture() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload(result: any) {
    const { secure_url, public_id, width, height } = result.info;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_INGEST_KEY
            ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_INGEST_KEY}` }
            : {}),
        },
        body: JSON.stringify({ imageUrl: secure_url, publicId: public_id, width, height }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage(`Detected ${json.detected} item${json.detected === 1 ? '' : 's'}.`);
      } else {
        setMessage(`Error: ${json.error ?? 'Unknown error'}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message ?? err.toString()}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <CldUploadWidget
        uploadPreset={
          process.env.NEXT_PUBLIC_CLOUDINARY_PRESET ||
          (process.env.CLOUDINARY_UPLOAD_PRESET as string | undefined) ||
          '<YOUR_PRESET>'
        }
        onUpload={handleUpload}
      >
        {({ open }) => (
          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            type="button"
            onClick={() => open()}
          >
            Capture / Upload Garage Photo
          </button>
        )}
      </CldUploadWidget>
      {busy && <p className="text-sm">Analyzing…</p>}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}