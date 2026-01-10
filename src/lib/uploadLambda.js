// src/lib/uploadLambda.js

// This is the front-end helper that talks to your ScholarsUploadFn Lambda,
// gets a presigned URL, and uploads the file directly to S3.

const UPLOAD_LAMBDA_URL = import.meta.env.VITE_UPLOAD_LAMBDA_URL;

if (!UPLOAD_LAMBDA_URL) {
  console.warn(
    "[uploadLambda] VITE_UPLOAD_LAMBDA_URL is not set. Check your .env files."
  );
}

/* ----------------- small utils ----------------- */

function safeType(file) {
  return (file && file.type) || "application/octet-stream";
}

/**
 * XHR upload so we can support onProgress.
 * If onProgress is not provided, this still works fine.
 */
function xhrUpload({ url, method = "PUT", headers = {}, body, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    Object.entries(headers || {}).forEach(([k, v]) => {
      if (v != null) xhr.setRequestHeader(k, String(v));
    });

    if (typeof onProgress === "function") {
      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const pct = Math.round((evt.loaded / evt.total) * 100);
        try {
          onProgress({
            loaded: evt.loaded,
            total: evt.total,
            percent: pct,
          });
        } catch {
          // ignore user callback errors
        }
      };
    }

    xhr.onerror = () => {
      reject(new Error("Network error during S3 upload"));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status, ok: true });
      } else {
        reject(
          new Error(
            `S3 upload failed (${xhr.status}): ${xhr.responseText || "no body"}`
          )
        );
      }
    };

    xhr.send(body);
  });
}

/**
 * Upload a file to S3 using the ScholarsUploadFn Lambda.
 *
 * @param {File|Blob} file - Browser File object
 * @param {Object} [opts]
 * @param {string} [opts.folder] - Optional folder prefix ("uploads" by default)
 * @param {function} [opts.onProgress] - Optional progress callback ({ loaded, total, percent })
 * @returns {Promise<{ key: string, url: string, size?: number, contentType?: string, originalName?: string }>}
 */
export async function uploadFileToS3(file, opts = {}) {
  if (!UPLOAD_LAMBDA_URL) {
    throw new Error("Upload Lambda URL is not configured");
  }
  if (!file) {
    throw new Error("No file provided");
  }

  const folder = opts.folder || "uploads";
  const onProgress = opts.onProgress;
  const contentType = safeType(file);

  /* --------------------------------------------------
   * 1️⃣ REQUEST A SIGNED URL FROM LAMBDA
   * -------------------------------------------------- */
  const signRes = await fetch(UPLOAD_LAMBDA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: contentType,
      folder,
    }),
  });

  if (!signRes.ok) {
    const txt = await signRes.text().catch(() => "");
    throw new Error(
      `Failed to get upload URL (${signRes.status}): ${txt || signRes.statusText}`
    );
  }

  const data = await signRes.json().catch(() => null);

  if (!data || !data.ok || !data.uploadUrl || !data.fileKey) {
    console.error("[uploadLambda] Unexpected Lambda response:", data);
    throw new Error("Lambda did not return required fields (ok/uploadUrl/fileKey)");
  }

  const uploadUrl = data.uploadUrl;
  const fileKey = data.fileKey;

  // Accept Lambda variations:
  const bucket = data.bucket || data.bucketName;
  const region = data.region || data.bucketRegion || "us-east-1";

  if (!bucket) {
    throw new Error("Lambda did not return bucket name");
  }

  /* --------------------------------------------------
   * 2️⃣ UPLOAD FILE DIRECTLY TO S3 (PUT, with progress)
   * -------------------------------------------------- */
  await xhrUpload({
    url: uploadUrl,
    method: "PUT",
    headers: {
      // Must match the Content-Type used when signing
      "Content-Type": contentType,
    },
    body: file,
    onProgress,
  });

  /* --------------------------------------------------
   * 3️⃣ CONSTRUCT PUBLIC URL
   * -------------------------------------------------- */
  /*const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;*/

  /* --------------------------------------------------
 * 3️⃣ CONSTRUCT PUBLIC URL
 * -------------------------------------------------- */
const CLOUDFRONT_DOMAIN = import.meta.env.VITE_UPLOADS_CDN_DOMAIN || "d3d7m2wzxdf6rh.cloudfront.net";
const publicUrl = `https://${CLOUDFRONT_DOMAIN}/${fileKey}`;







  // For backward compatibility, we *must* return at least { key, url }.
  return {
    key: fileKey,
    url: publicUrl,
    size: typeof file.size === "number" ? file.size : undefined,
    contentType,
    originalName: file.name,
  };
}