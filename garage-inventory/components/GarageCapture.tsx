"use client";

import { useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import type {
  CloudinaryUploadWidgetInfo,
  CloudinaryUploadWidgetResults,
} from 'next-cloudinary';

const CldUploadWidget = dynamic(() => import('next-cloudinary').then(m => m.CldUploadWidget), {
  ssr: false,
});

interface DetectedItem {
  name: string;
  bbox?: { x: number; y: number; w: number; h: number };
}

/**
 * GarageCapture provides a button that opens a Cloudinary upload widget. On
 * successful upload, it posts the image URL to `/api/ingest` to trigger
 * detection and persistence. Feedback is displayed below the button.
 */
export default function GarageCapture() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ url: string; width: number; height: number } | null>(null);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const ingestKey = process.env.NEXT_PUBLIC_INGEST_KEY ?? '';
  const uploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_PRESET ||
    (process.env.CLOUDINARY_UPLOAD_PRESET as string | undefined);
  if (!uploadPreset) {
    throw new Error(
      'Cloudinary upload preset is not configured. Set NEXT_PUBLIC_CLOUDINARY_PRESET or CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  async function handleUpload(result: CloudinaryUploadWidgetResults) {
    if (result.event !== 'success') {
      setMessage(`Upload failed: ${result.event}`);
      return;
    }
    const info = result.info as CloudinaryUploadWidgetInfo;
    const { secure_url, width, height } = info;
    setBusy(true);
    setMessage(null);
    setPhoto({ url: secure_url, width, height });
    setItems([]);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ingestKey ? { Authorization: `Bearer ${ingestKey}` } : {}),
        },
        body: JSON.stringify({ imageUrl: secure_url, width, height }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMessage(`Error: ${json.error ?? res.statusText}`);
        return;
      }
      setMessage(`Detected ${json.detected} item${json.detected === 1 ? '' : 's'}.`);
      setItems(json.items ?? []);
    } catch (err: any) {
      setMessage(`Error: ${err.message ?? err.toString()}`);
    } finally {
      setBusy(false);
    }
  }

  function updateItemName(index: number, name: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, name } : it)));
  }

  return (
    <div className="space-y-3">
      <CldUploadWidget uploadPreset={uploadPreset} onUpload={handleUpload}>
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
      {photo && (
        <div
          className="relative inline-block"
          style={{ width: photo.width, height: photo.height }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="Uploaded" width={photo.width} height={photo.height} />
          {items.map((it, idx) => {
            const box = it.bbox;
            if (!box) return null;
            const style = {
              left: `${box.x * photo.width}px`,
              top: `${box.y * photo.height}px`,
              width: `${box.w * photo.width}px`,
              height: `${box.h * photo.height}px`,
            } as CSSProperties;
            return (
              <div
                key={idx}
                className="absolute border-2 border-red-500"
                style={style}
              >
                <input
                  className="absolute -top-6 left-0 bg-white text-xs"
                  value={it.name}
                  onChange={(e) => updateItemName(idx, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

