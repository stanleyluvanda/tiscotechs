// src/components/upload/AttachmentUploader.jsx
import { useCallback, useState } from "react";
import { uploadFileToS3 } from "../../lib/uploadLambda";

/**
 * Attachment object shape (what this component returns via `onChange`):
 *
 * {
 *   url: string,        // public S3 URL
 *   key: string,        // S3 object key (folder/file.ext)
 *   fileName: string,   // original file.name
 *   size: number,       // file.size in bytes
 *   mime: string,       // file.type
 *   type: "image" | "document" | "other"
 * }
 */

// --------- small helpers ----------
const MAX_FILES_DEFAULT = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function classifyType(mime = "") {
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (
    m === "application/pdf" ||
    m === "application/msword" ||
    m ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    m === "application/vnd.ms-powerpoint" ||
    m ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    m === "application/vnd.ms-excel" ||
    m ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    m.startsWith("text/")
  ) {
    return "document";
  }
  return "other";
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * AttachmentUploader
 *
 * Props:
 *  - value: Attachment[]   (current attachments)
 *  - onChange: (Attachment[]) => void
 *  - role?: "student" | "lecturer"  (for future tweaks; both share same rules now)
 *  - folder?: string       (S3 folder prefix, e.g. "student-posts", "lecturer-posts")
 *  - maxFiles?: number     (default 5)
 *
 * NOTE: This uploader **never** accepts video files.
 * Lecturers will add videos via a separate “YouTube URL” field on the dashboard.
 */
export default function AttachmentUploader({
  value = [],
  onChange,
  role = "student",
  folder = "attachments",
  maxFiles = MAX_FILES_DEFAULT,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const currentCount = Array.isArray(value) ? value.length : 0;
  const remainingSlots = Math.max(0, maxFiles - currentCount);

  const handleFiles = useCallback(
    async (fileList) => {
      if (!fileList || fileList.length === 0) return;
      if (!onChange) return;

      const files = Array.from(fileList);

      if (remainingSlots <= 0) {
        setError(`You can attach up to ${maxFiles} files.`);
        return;
      }

      const slice = files.slice(0, remainingSlots);

      // filter & validate
      const validFiles = [];
      for (const f of slice) {
        if (!f) continue;

        if (f.size > MAX_FILE_SIZE) {
          setError(
            `File "${f.name}" is too large. Maximum size is ${formatSize(
              MAX_FILE_SIZE
            )}.`
          );
          continue;
        }

        const t = classifyType(f.type);

        // We only allow images & documents. No video uploads.
        if (t === "other") {
          setError(
            `File "${f.name}" is not a supported type. Please upload images or documents only.`
          );
          continue;
        }

        validFiles.push(f);
      }

      if (!validFiles.length) return;

      setError("");
      setUploading(true);

      const newAttachments = [];

      try {
        for (const f of validFiles) {
          const res = await uploadFileToS3(f, { folder });
          const attType = classifyType(f.type);

          newAttachments.push({
            url: res.url,
            key: res.key,
            fileName: f.name,
            size: f.size,
            mime: f.type || "application/octet-stream",
            type: attType,
          });
        }

        // ✅ Dedupe before saving to state (does not affect S3/backend logic)
        const combined = [...(value || []), ...newAttachments];

        // Dedupe by stable identifier (prefer key, fallback url, fallback fileName+size)
        const seen = new Set();
        const next = combined.filter((a) => {
          const id =
            String(a?.key || "") ||
            String(a?.url || "") ||
            `${String(a?.fileName || "")}__${String(a?.size || "")}`;
          if (!id) return false;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        onChange(next);
      } catch (e) {
        console.error("[AttachmentUploader] upload error:", e);
        setError(e?.message || "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [folder, maxFiles, onChange, remainingSlots, value]
  );

  const onInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length) {
      handleFiles(files);
      // reset so user can re-select the same file again if needed
      e.target.value = "";
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files && files.length) {
      handleFiles(files);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeAttachment = (idx) => {
    if (!onChange) return;
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };

  const accept =
    "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain";

  return (
    <div className="space-y-2">
      {/* Drop zone + button */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        /*className={`border-2 border-dashed rounded-lg px-4 py-3 text-sm cursor-pointer bg-slate-50 hover:bg-slate-100 ${
          uploading ? "opacity-70 cursor-progress" : ""*/
          className={`border border-dashed rounded-md px-1 py-0.5 text-sm cursor-pointer bg-slate-50 hover:bg-slate-100 ${
  uploading ? "opacity-70 cursor-progress" : ""

        }`}
      >
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div className="flex flex-col">
            <span className="font-medium text-slate-700">
              Attach files (max {maxFiles})
            </span>
            <span className="text-xs text-slate-500">
              Images (JPG, PNG, GIF, WebP) and documents (PDF, DOCX, PPTX, XLSX,
              TXT). Max {formatSize(MAX_FILE_SIZE)} each.
            </span>
          </div>
          <div>
            <span className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              {uploading ? "Uploading..." : "Browse"}
            </span>
          </div>
          <input
            type="file"
            multiple
            accept={accept}
            onChange={onInputChange}
            className="hidden"
            disabled={uploading || remainingSlots <= 0}
          />
        </label>
        {remainingSlots <= 0 && (
          <p className="mt-1 text-xs text-slate-500">
            You have attached the maximum of {maxFiles} files.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}

      {/* List of attachments */}
      {(value || []).length > 0 && (
        <ul className="space-y-2 text-sm">
          {value.map((att, idx) => (
            <li
              key={`${att.key || att.url}-${idx}`}
              className="flex items-center justify-between gap-3 rounded border bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* preview / icon */}
                {att.type === "image" ? (
                  <img
                    src={att.url}
                    alt={att.fileName || "image"}
                    className="h-10 w-10 rounded object-cover border"
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center rounded border bg-white text-xs text-slate-600">
                    📄
                  </div>
                )}

                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-800">
                    {att.fileName || "Attachment"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {att.type} · {formatSize(att.size)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#1a73e8] underline"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-xs text-slate-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}