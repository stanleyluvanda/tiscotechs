// src/pages/UploadTest.jsx 

// ✅ YES — this must be the FIRST line in the file
console.log("UPLOAD_LAMBDA:", import.meta.env.VITE_UPLOAD_LAMBDA_URL);

import { useState } from "react";
import { uploadFileToS3 } from "../lib/uploadLambda";

export default function UploadTest() {
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("Uploading...");
    setUrl("");

    try {
      const result = await uploadFileToS3(file, { folder: "test" });
      setStatus("Upload complete ✅");
      setUrl(result.url);
      console.log("Uploaded:", result);
    } catch (err) {
      console.error(err);
      setStatus("Upload failed ❌ " + err.message);
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-3">
      <h1 className="text-xl font-semibold">S3 Upload Test</h1>
      <input type="file" onChange={handleChange} className="block" />
      {status && <p>{status}</p>}
      {url && (
        <p className="break-all">
          File URL:{" "}
          <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
            {url}
          </a>
        </p>
      )}
    </div>
  );
}