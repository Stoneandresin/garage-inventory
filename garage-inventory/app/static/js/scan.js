/**
 * Streaming capture script.
 *
 * Captures video chunks from the user's camera and uploads them sequentially
 * to the `/api/stream/ingest` endpoint. After each upload, the server returns
 * a JSON object that may include a `queued` value indicating how many chunks
 * remain to be processed. When this queue exceeds `QUEUE_THRESHOLD`, the
 * capture is paused to avoid overloading the server. Capture resumes once the
 * queue depth drops back below the threshold.
 */
(async () => {
  const videoEl = document.getElementById('scan-video');
  if (!videoEl) {
    console.error('Expected a video element with id "scan-video"');
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (err) {
    console.error('Unable to access camera', err);
    return;
  }

  videoEl.srcObject = stream;
  await videoEl.play();

  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
  const chunks = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  // Capture short chunks to send to the server.
  const CHUNK_MS = 500; // 2 FPS baseline
  recorder.start(CHUNK_MS);

  const QUEUE_THRESHOLD = 5;
  let paused = false;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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
      }
    }
  }

  uploadLoop();
})();
