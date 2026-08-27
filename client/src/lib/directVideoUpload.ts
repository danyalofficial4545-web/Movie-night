export type DirectVideoUploadInput = {
  file: File;
  uploadUrl: string;
  contentType: string;
  onProgress: (percent: number) => void;
};

const UPLOAD_IDLE_TIMEOUT_MS = 90_000;

export function uploadVideoToSignedUrl({ file, uploadUrl, contentType, onProgress }: DirectVideoUploadInput) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastProgressAt = Date.now();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      globalThis.clearInterval(idleTimer);
      error ? reject(error) : resolve();
    };
    const idleTimer = globalThis.setInterval(() => {
      if (Date.now() - lastProgressAt > UPLOAD_IDLE_TIMEOUT_MS) {
        finish(new Error("Upload timed out because no video data was transferred for 90 seconds. Check your connection or paste a public HTTPS video URL instead."));
        xhr.abort();
      }
    }, 5_000);

    xhr.open("PUT", uploadUrl, true);
    xhr.timeout = UPLOAD_IDLE_TIMEOUT_MS + 15_000;
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = event => {
      lastProgressAt = Date.now();
      if (!event.lengthComputable) return;
      onProgress(Math.min(99, Math.max(0, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onerror = () => finish(new Error("Video upload failed. Check your connection and try again, or paste a public HTTPS video URL."));
    xhr.ontimeout = () => finish(new Error("Video upload timed out. Check your connection and try again, or paste a public HTTPS video URL."));
    xhr.onabort = () => finish(new Error("Video upload was cancelled before it completed."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) finish();
      else finish(new Error(`Supabase rejected the upload (${xhr.status}). Please try again or paste a public HTTPS video URL.`));
    };
    onProgress(0);
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file, file.name);
    xhr.send(body);
  });
}
