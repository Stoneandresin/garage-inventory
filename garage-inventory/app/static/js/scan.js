// Updated scan.js for the AI Garage continuous-scan page
// This version uses a Safari-friendly MediaRecorder, implements
// snapshot fallback, and draws server and preview detections
// separately so preview boxes are not cleared when server boxes
// arrive. Copy and paste this into your existing scan.js.

// Globals for media capture and streaming
let mediaStream;
let recorder;
let sessionId;
let sse;
let chunks = [];
let uploadInterval;

const video = document.getElementById("preview");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");

// Ingest token can be supplied via a global config or from the server.
let ingestToken = window.INGEST_TOKEN;
const ingestHeaders = () =>
  ingestToken ? { Authorization: `Bearer ${ingestToken}` } : {};

// Fit the overlay canvas to the video element
function fitCanvas() {
  const r = video.getBoundingClientRect();
  canvas.width = r.width;
  canvas.height = r.height;
}
window.addEventListener("resize", fitCanvas);

// Start scanning: request camera, choose a supported MIME, start
// MediaRecorder or fallback to snapshots, and open SSE stream
async function startScan() {
  // Create a new stream session
  const res = await fetch("/api/stream/start", { method: "POST" });
  const data = await res.json();
  sessionId = data.session_id;
  if (data.ingest_token) {
    ingestToken = data.ingest_token;
  }

  // Acquire rear camera; use modest resolution to reduce upload size
  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 10, max: 15 },
    },
    audio: false,
  });
  video.srcObject = mediaStream;
  await video.play();
  fitCanvas();

  // Determine best MIME for MediaRecorder on the current browser
  let mimeType;
  try {
    const mp4 = "video/mp4;codecs=h264";
    const webmVp9 = "video/webm;codecs=vp9";
    const webm = "video/webm";
    if (MediaRecorder.isTypeSupported(mp4)) {
      mimeType = mp4;
    } else if (MediaRecorder.isTypeSupported(webmVp9)) {
      mimeType = webmVp9;
    } else if (MediaRecorder.isTypeSupported(webm)) {
      mimeType = webm;
    }
  } catch (err) {
    // Ignore; will fall back to default
  }

  // Try to start MediaRecorder; fallback to snapshots if unsupported
  try {
    recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : {});
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    recorder.start(2000); // 2 s chunks
    // Periodically upload chunks
    uploadInterval = setInterval(uploadChunks, 2000);
  } catch (e) {
    console.warn("MediaRecorder not available; falling back to snapshot mode", e);
    snapshotLoop();
  }

  // Open the SSE stream for detection updates
  openSSE();

  // Kick off the overlay drawing loop to layer server and preview boxes
  overlayLoop();
}

// Upload recorded chunks to the server
async function uploadChunks() {
  while (chunks.length) {
    const blob = chunks.shift();
    const fd = new FormData();
    fd.append("type", "video");
    fd.append("seq", Date.now().toString());
    // Use file extension based on MIME
    const ext =
      recorder && recorder.mimeType && recorder.mimeType.startsWith("video/mp4")
        ? "mp4"
        : "webm";
    fd.append("payload", blob, `chunk.${ext}`);
    try {
      await fetch(`/api/stream/ingest?session_id=${sessionId}`, {
        method: "POST",
        body: fd,
        headers: ingestHeaders(),
      });
    } catch (err) {
      console.error("Error uploading chunk", err);
    }
  }
}

// Snapshot fallback: capture JPEG frames every ~333 ms
async function snapshotLoop() {
  const snapCanvas = document.createElement("canvas");
  const sctx = snapCanvas.getContext("2d");
  // Set a reasonable capture size
  snapCanvas.width = 640;
  snapCanvas.height = 360;
  while (sessionId) {
    await new Promise((r) => setTimeout(r, 333));
    try {
      sctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
      const blob = await new Promise((resolve) => {
        snapCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.7);
      });
      const fd = new FormData();
      fd.append("type", "frame");
      fd.append("seq", Date.now().toString());
      fd.append("payload", blob, "frame.jpg");
      await fetch(`/api/stream/ingest?session_id=${sessionId}`, {
        method: "POST",
        body: fd,
        headers: ingestHeaders(),
      });
    } catch (err) {
      console.error("Error uploading snapshot", err);
    }
  }
}

// Open SSE to listen for server detections and update overlay
function openSSE() {
  const url = ingestToken
    ? `/api/stream/${sessionId}/events?token=${ingestToken}`
    : `/api/stream/${sessionId}/events`;
  sse = new EventSource(url);
  sse.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    if (data.type === "detections") {
      // Cache server detections for overlay
      serverDetections = data.detections;
    }
  };
  sse.onerror = (err) => {
    console.error("SSE error", err);
  };
}

 codex/add-authorization-header-to-fetch-call-r50xnn
// Cache for server detections, updated via SSE
let serverDetections = [];

  const INGEST_TOKEN = window.INGEST_TOKEN;
  const headers = INGEST_TOKEN ? { Authorization: `Bearer ${INGEST_TOKEN}` } : {};

  const QUEUE_THRESHOLD = 5;
  let paused = false;
     main

// Optional preview model for dashed boxes
let previewModel = null;
let previewEnabled = true;
// Load preview model if TFJS is available
async function loadPreviewModel() {
  if (!previewEnabled) return;
  try {
    const module = await import("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.14.0/dist/tf.min.js");
    const coco = await import("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js");
    await module.ready();
    previewModel = await coco.load();
    console.log("Loaded coco-ssd preview model");
  } catch (err) {
    console.warn("Preview model failed to load", err);
  }
}
loadPreviewModel();

codex/add-authorization-header-to-fetch-call-r50xnn
// Overlay loop: draw server boxes (solid) and preview boxes (dashed)
async function overlayLoop() {
  const W = () => canvas.width;
  const H = () => canvas.height;
  const tmp = document.createElement("canvas");
  tmp.width = 320;
  tmp.height = 180;
  const tctx = tmp.getContext("2d");

  while (sessionId) {
    await new Promise((r) => requestAnimationFrame(r));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw solid server boxes
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00e0ff";
    ctx.font = "12px sans-serif";
    for (const d of serverDetections) {
      const [nx, ny, nw, nh] = d.norm;
      const x = nx * W();
      const y = ny * H();
      const w = nw * W();
      const h = nh * H();
      ctx.strokeRect(x, y, w, h);
      const label = `${d.label} ${Math.round(d.conf * 100)}%`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(0, 224, 255, 0.5)";
      ctx.fillRect(x, y - 18, textWidth + 8, 18);
      ctx.fillStyle = "#000";
      ctx.fillText(label, x + 4, y - 4);
    }
    // Draw dashed preview boxes if preview model is loaded
    if (previewModel) {
      // Downscale the video frame for faster detection
      tctx.drawImage(video, 0, 0, tmp.width, tmp.height);
      const predictions = await previewModel.detect(tmp);
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#ffd166";
      for (const pred of predictions) {
        const [px, py, pw, ph] = pred.bbox;
        const sx = px / tmp.width;
        const sy = py / tmp.height;
        const sw = pw / tmp.width;
        const sh = ph / tmp.height;
        const x = sx * W();
        const y = sy * H();
        const w = sw * W();
        const h = sh * H();
        ctx.strokeRect(x, y, w, h);
        const pLabel = `${pred.class} (preview)`;
        const textWidth = ctx.measureText(pLabel).width;
        ctx.fillStyle = "rgba(255, 209, 102, 0.4)";
        ctx.fillRect(x, y - 18, textWidth + 8, 18);
        ctx.fillStyle = "#000";
        ctx.fillText(pLabel, x + 4, y - 4);
=======
  async function uploadLoop() {
    while (true) {
      if (chunks.length === 0) {
        await sleep(50);
        continue;
      }
      const chunk = chunks.shift();
      try {
        const res = await fetch('/api/stream/ingest', {
          method: 'POST',
          body: chunk,
          headers,
        });
        let data = {};
        try {
          data = await res.json();
        } catch (err) {
          // ignore JSON parse errors
        }
        const queued = typeof data.queued === 'number' ? data.queued : 0;
        if (queued > QUEUE_THRESHOLD && !paused) {
          recorder.pause();
          paused = true;
        } else if (queued <= QUEUE_THRESHOLD && paused) {
          recorder.resume();
          paused = false;
        }
      } catch (err) {
        console.error('Failed to upload chunk', err);
       main
      }
      ctx.restore();
    }
  }
}

// Stop the scanning session and clean up
async function stopScan() {
  if (recorder) {
    try {
      recorder.stop();
    } catch (err) {
      console.warn("Recorder stop error", err);
    }
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
  }
  if (uploadInterval) {
    clearInterval(uploadInterval);
    uploadInterval = null;
  }
  // Close SSE
  if (sse) sse.close();
  // Notify server to stop session
  await fetch("/api/stream/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  // Reset session state
  sessionId = null;
  serverDetections = [];
  chunks = [];
}

// Hook up UI buttons
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
startBtn.onclick = () => {
  startBtn.disabled = true;
  stopBtn.disabled = false;
  startScan().catch((err) => {
    console.error("Error starting scan", err);
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });
};
stopBtn.onclick = () => {
  stopBtn.disabled = true;
  startBtn.disabled = false;
  stopScan().catch((err) => {
    console.error("Error stopping scan", err);
  });
};

