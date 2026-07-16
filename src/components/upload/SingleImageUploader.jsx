// src/components/upload/SingleImageUploader.jsx
import { useState } from "react";

/*
  PROPS:
  - value: current image URL (string | null)
  - onChange(url): callback after successful upload
  - folder: e.g. "profiles", "partners", "products"
  - accept: MIME filter, default "image/*"
  - maxSizeMB: default 5
  - label: UI label above uploader (default "Profile Photo") ✅ NEW
*/

const FALLBACK_UPLOAD_LAMBDA =
  /*"https://tepyhcsaf6ttzmbtigyuun1573u0jmhuj.lambda-url.us-east-1.on.aws";*/
  "https://tepyhcsa6ttzmtbiqvuunj573u0jmuhj.lambda-url.us-east-1.on.aws";

// ✅ ADD HELPERS RIGHT HERE (top-level, outside the component)
function looksPresigned(url = "") {
  const u = String(url || "");
  return /X-Amz-Signature=|X-Amz-Algorithm=|X-Amz-Credential=|X-Amz-Date=/.test(u);
}

function makeUniqueFilename(originalName = "image") {
  const name = String(originalName || "image");
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  const base = dot >= 0 ? name.slice(0, dot) : name;

  const safeBase = base.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 50) || "image";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);

  return `${safeBase}_${stamp}_${rand}${ext || ".jpg"}`;
}






// ADD THIS NEW HELPER HERE
async function optimizeProfileImage(file) {
  if (!file?.type?.startsWith("image/")) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    const maxSize = 320;

    const ratio = Math.min(
      1,
      maxSize / image.width,
      maxSize / image.height
    );

    const width = Math.max(
      1,
      Math.round(image.width * ratio)
    );

    const height = Math.max(
      1,
      Math.round(image.height * ratio)
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.82);
    });

    if (!blob) {
      return file;
    }

    const baseName =
      String(file.name || "profile")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9_-]+/gi, "_")
        .slice(0, 50) || "profile";

    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn(
      "[SingleImageUploader] image optimization skipped:",
      err
    );

    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}























export default function SingleImageUploader({
  value = null,
  onChange,
  folder = "uploads",
  accept = "image/*",
  maxSizeMB = 5,
  label = "Profile Photo", // ✅ NEW
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const UPLOAD_LAMBDA =
    import.meta.env.VITE_UPLOAD_LAMBDA_URL || FALLBACK_UPLOAD_LAMBDA;

  async function handleFile(file) {
  setError("");

  if (!file) return;

  if (!UPLOAD_LAMBDA) {
    setError("Upload endpoint not configured");
    return;
  }

  try {
    setUploading(true);

    const uploadFile = await optimizeProfileImage(file);

    const maxBytes = maxSizeMB * 1024 * 1024;

    if (uploadFile.size > maxBytes) {
      setError(`Max file size is ${maxSizeMB}MB`);
      return;
    }

    const uniqueName = makeUniqueFilename(uploadFile.name);

    const res = await fetch(UPLOAD_LAMBDA, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        folder,
        filename: uniqueName,
        originalName: file.name,
        type: uploadFile.type,
        contentType:
          uploadFile.type || "application/octet-stream",
        size: uploadFile.size,
      }),
    });

    if (!res.ok) {
      console.error(
        "[SingleImageUploader] meta error",
        res.status
      );

      setError("Failed to request upload URL");
      return;
    }

    const meta = await res.json();

    console.log(
      "[SingleImageUploader] upload meta:",
      meta
    );

    let uploadUrl =
      meta.uploadUrl ||
      meta.uploadURL ||
      meta.signedUrl ||
      meta.signedURL;

    if (!uploadUrl && meta.url && looksPresigned(meta.url)) {
      uploadUrl = meta.url;
    }

    let fileUrl =
      meta.cloudfrontUrl ||
      meta.cloudFrontUrl ||
      meta.cdnUrl ||
      meta.publicUrl ||
      meta.fileUrl ||
      meta.finalUrl;

    if (!fileUrl && meta.url && !looksPresigned(meta.url)) {
      fileUrl = meta.url;
    }

    if (
      !fileUrl &&
      meta.key &&
      (
        meta.cdnBaseUrl ||
        meta.cloudfrontBaseUrl ||
        meta.cdnBase
      )
    ) {
      const base = String(
        meta.cdnBaseUrl ||
          meta.cloudfrontBaseUrl ||
          meta.cdnBase
      ).replace(/\/+$/, "");

      const key = String(meta.key).replace(/^\/+/, "");

      fileUrl = `${base}/${key}`;
    }

    if (looksPresigned(fileUrl)) {
      console.error(
        "[SingleImageUploader] fileUrl is presigned (bad):",
        fileUrl,
        meta
      );

      setError(
        "Upload service returned a temporary URL. Expected a CloudFront/public URL."
      );

      return;
    }

    if (!uploadUrl || !fileUrl) {
      console.error(
        "[SingleImageUploader] invalid meta:",
        meta
      );

      setError("Upload service returned an invalid response");
      return;
    }

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type":
          uploadFile.type || "application/octet-stream",
      },
      body: uploadFile,
    });

    if (!putRes.ok) {
      console.error(
        "[SingleImageUploader] PUT failed",
        putRes.status
      );

      setError("Upload failed. Try again.");
      return;
    }

    onChange?.(fileUrl);
  } catch (err) {
    console.error(
      "[SingleImageUploader] upload failed",
      err
    );

    setError("Upload failed");
  } finally {
    setUploading(false);
  }
}
  function onSelect(e) {
    const file = e.target.files?.[0];
    handleFile(file);
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      <div className="flex items-center gap-4">
        {/* Left: Image preview (icon when empty) */}
        <div className="w-20 h-20 rounded-full overflow-hidden border bg-blue-900 flex items-center justify-center">
          {value ? (
            <img
              src={value}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-12 w-12 text-white"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20 21a8 8 0 0 0-16 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 13a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Right: Button */}
        <div>
          <label className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
            {uploading ? "Uploading..." : "Choose Image"}
            <input
              type="file"
              accept={accept}
              onChange={onSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}