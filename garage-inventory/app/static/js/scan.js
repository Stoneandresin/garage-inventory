let mediaRecorder;
let stream;
let sessionId;
let seq = 0;
const pendingChunks = new Map();
let snapshotInterval;

function sendChunk(data, currentSeq) {
  const url = `/api/stream/ingest?session_id=${encodeURIComponent(sessionId)}&seq=${currentSeq}`;
  pendingChunks.set(currentSeq, data);
  fetch(url, { method: 'POST', body: data }).finally(() => {
    pendingChunks.delete(currentSeq);
  });
}

function flushPending() {
  for (const [s, data] of pendingChunks.entries()) {
    const url = `/api/stream/ingest?session_id=${encodeURIComponent(sessionId)}&seq=${s}`;
    navigator.sendBeacon(url, data);
  }
  pendingChunks.clear();
}

export async function start(id) {
  sessionId = id;
  seq = 0;
  const video = document.querySelector('video');
  stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = stream;
  await video.play();

  if (typeof MediaRecorder !== 'undefined') {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorder.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) {
        sendChunk(e.data, seq++);
      }
    });
    mediaRecorder.start(1000);
  } else {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    snapshotInterval = setInterval(() => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          sendChunk(blob, seq++);
        }
      }, 'image/jpeg');
    }, 1000);
  }
}

export function stop() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.addEventListener('stop', flushPending, { once: true });
    mediaRecorder.stop();
  } else {
    flushPending();
  }
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = undefined;
  }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = undefined;
  }
}
