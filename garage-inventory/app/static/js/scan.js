// scan.js - client-side capture and overlay logic
// The code is written so it can also be imported in Node tests where DOM is
// not available.  Functions `iou` and `ema` are exported for unit tests.

function iou(a, b) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const interX1 = Math.max(a.x, b.x);
  const interY1 = Math.max(a.y, b.y);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);
  const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
  const union = a.w * a.h + b.w * b.h - interArea;
  return union === 0 ? 0 : interArea / union;
}

function ema(prev, next, alpha) {
  return prev + alpha * (next - prev);
}

// export for Node tests
if (typeof module !== 'undefined') {
  module.exports = { iou, ema };
}

// Browser-only logic
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('preview');
    const canvas = document.getElementById('overlay');
    if (!video || !canvas) return; // not on scan page

    const ctx = canvas.getContext('2d');
    const EMA_ALPHA = 0.5;
    const MATCH_IOU = 0.5;
    const PRUNE_FRAMES = 15;

    let sessionId = null;
    let es = null;
    let frame = 0;

    const tracks = [];

    function drawLoop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      tracks.forEach((t, idx) => {
        // prune stale tracks
        if (frame - t.lastSeen > PRUNE_FRAMES) {
          tracks.splice(idx, 1);
          return;
        }
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 2;
        if (t.authoritative) {
          ctx.strokeStyle = '#00FF00';
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#FFFF00';
          ctx.setLineDash([4, 2]);
        }
        ctx.strokeRect(t.bbox.x, t.bbox.y, t.bbox.w, t.bbox.h);
        const label = `${t.label}${t.authoritative ? ` ${Math.round(t.conf * 100)}%` : ' (preview)'}`;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(t.bbox.x, t.bbox.y - 14, ctx.measureText(label).width + 4, 14);
        ctx.fillStyle = '#FFF';
        ctx.fillText(label, t.bbox.x + 2, t.bbox.y - 3);
        ctx.restore();
      });
      frame++;
      requestAnimationFrame(drawLoop);
    }

    function reconcile(serverDetections) {
      serverDetections.forEach((det) => {
        const bbox = {
          x: det.norm[0] * canvas.width,
          y: det.norm[1] * canvas.height,
          w: det.norm[2] * canvas.width,
          h: det.norm[3] * canvas.height,
        };

        // find best matching track
        let best = null;
        let bestScore = 0;
        tracks.forEach((t) => {
          const score = iou(t.bbox, bbox);
          if (score > bestScore) {
            best = t;
            bestScore = score;
          }
        });

        if (best && bestScore >= MATCH_IOU) {
          // update existing track with EMA smoothing
          best.bbox.x = ema(best.bbox.x, bbox.x, EMA_ALPHA);
          best.bbox.y = ema(best.bbox.y, bbox.y, EMA_ALPHA);
          best.bbox.w = ema(best.bbox.w, bbox.w, EMA_ALPHA);
          best.bbox.h = ema(best.bbox.h, bbox.h, EMA_ALPHA);
          best.label = det.label;
          best.conf = det.conf;
          best.authoritative = true;
          best.lastSeen = frame;
        } else {
          tracks.push({
            id: det.track_id || `srv-${Math.random()}`,
            bbox,
            label: det.label,
            conf: det.conf,
            authoritative: true,
            lastSeen: frame,
          });
        }
      });
    }

    async function start() {
      const res = await fetch('/api/stream/start', { method: 'POST' });
      sessionId = (await res.json()).id;

      es = new EventSource(`/api/stream/${sessionId}/events`);
      es.addEventListener('detections', (ev) => {
        const data = JSON.parse(ev.data);
        reconcile(data.detections);
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.font = '12px sans-serif';
      drawLoop();
    }

    async function stop() {
      if (es) es.close();
      if (sessionId) {
        await fetch('/api/stream/stop?session_id=' + sessionId, { method: 'POST' });
      }
      const stream = video.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
      tracks.length = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sessionId = null;
    }

    document.getElementById('start').addEventListener('click', start);
    document.getElementById('stop').addEventListener('click', stop);
  });
}

