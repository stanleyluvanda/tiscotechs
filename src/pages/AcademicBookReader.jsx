import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Session from "supertokens-web-js/recipe/session";
import { requestAcademicBookReadUrl } from "../lib/academicBooksApi";

export default function AcademicBookReader() {
  const { bookId } = useParams();
  const readerHeaderRef = useRef(null);
const [headerVisibleHeight, setHeaderVisibleHeight] = useState(56);

useEffect(() => {
  const updateReaderHeight = () => {
    const rect = readerHeaderRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Amount of the reader heading still visible below the fixed navbar.
    const visible = Math.max(0, rect.bottom - 56);
    setHeaderVisibleHeight(Math.min(rect.height, visible));
  };

  updateReaderHeight();
  window.addEventListener("scroll", updateReaderHeight, { passive: true });
  window.addEventListener("resize", updateReaderHeight);

  return () => {
    window.removeEventListener("scroll", updateReaderHeight);
    window.removeEventListener("resize", updateReaderHeight);
  };
}, []);

  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    async function loadPdf() {
      setLoading(true);
      setError("");
      setPdfUrl("");

      try {
        const accessToken = await Session.getAccessToken();

        if (!accessToken) {
          throw new Error(
            "Your session has expired. Please log in again."
          );
        }

        const { readUrl } = await requestAcademicBookReadUrl({
          bookId,
          accessToken,
        });

        // Download the PDF into a temporary browser object URL.
        // This keeps the S3 URL out of the address bar.
        const response = await fetch(readUrl);

        if (!response.ok) {
          throw new Error("Unable to load the academic book PDF.");
        }

        const pdfBlob = await response.blob();

        if (cancelled) return;

        objectUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          console.error("Academic book reader failed:", err);
          setError(
            err?.message || "Unable to open this academic book."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (bookId) {
      loadPdf();
    } else {
      setError("Academic book ID is missing.");
      setLoading(false);
    }

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [bookId]);

  return (
   <div className="min-h-screen bg-slate-100">
      <header
  ref={readerHeaderRef}
  className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-1.5"
>
        <h1 className="text-base font-semibold text-slate-900">
          ScholarsKnowledge Academic Book Reader
        </h1>

        <Link
  to="/platform/books"
  className="rounded-md bg-blue-700 px-3 py-1 text-xs font-medium text-white hover:bg-blue-800"
>
  Back to Library
</Link>
      </header>

      {loading && (
        <div className="p-8 text-center text-slate-600">
          Loading academic book...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mx-auto mt-8 max-w-xl rounded-lg border border-red-200 bg-white p-6 text-center text-red-700"
        >
          {error}
        </div>
      )}

      {!loading && !error && pdfUrl && (
        <iframe
  src={pdfUrl}
  title="Academic Book PDF Reader"
  className="w-full border-0"
  style={{
    height: `calc(100dvh - 56px - ${headerVisibleHeight}px)`,
  }}
/>
      )}
    </div>
  );
}