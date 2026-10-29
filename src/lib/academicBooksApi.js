//src/lib/academicBooksApi.js
const API_BASE = (
  import.meta.env.VITE_ACADEMIC_BOOKS_API_BASE || ""
).replace(/\/+$/, "");

// CloudFront endpoint for the public Academic Books feed only.
// All authenticated and write operations continue using API_BASE.
const PUBLIC_BOOKS_API_BASE =
  "https://d9xoeam8jbfti.cloudfront.net";

/**
 * Retrieve academic books using cursor pagination.
 *
 * This function only reads data.
 * It does not modify DynamoDB.
 */
export async function fetchAcademicBooks({
  limit = 20,
  cursor = null,
  subject = "All",
  subcategory = "All",
} = {}) {
  if (!API_BASE) {
    throw new Error("VITE_ACADEMIC_BOOKS_API_BASE is not configured");
  }

  /*const url = new URL(`${API_BASE}/books`);*/
  const url = new URL(`${PUBLIC_BOOKS_API_BASE}/books`);
  url.searchParams.set("limit", String(limit));

if (cursor) {
  url.searchParams.set("cursor", cursor);
}

if (subject && subject !== "All") {
  url.searchParams.set("subject", subject);
}

if (subcategory && subcategory !== "All") {
  url.searchParams.set("subcategory", subcategory);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Academic Books API returned HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data || data.ok !== true || !Array.isArray(data.books)) {
    throw new Error("Invalid Academic Books API response");
  }

  return {
    books: data.books,
    cursor: data.cursor ?? null,
  };
}
/**
 * Request a presigned S3 URL for uploading an academic book PDF.
 * Requires an authenticated SuperTokens access token.
 */
export async function requestAcademicBookUploadUrl({
  fileName,
  fileSize,
  accessToken,
}) {
  if (!API_BASE) {
    throw new Error("VITE_ACADEMIC_BOOKS_API_BASE is not configured");
  }

  if (!accessToken) {
    throw new Error("Please log in before sharing an academic book.");
  }

  const extension = String(fileName || "")
  .toLowerCase()
  .split(".")
  .pop();

const contentTypes = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const contentType = contentTypes[extension];

if (!contentType) {
  throw new Error("Only PDF and PowerPoint files are allowed.");
}

  const response = await fetch(`${API_BASE}/books/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "st-auth-mode": "header",
    },
body: JSON.stringify({
  fileName,
  fileSize,
  contentType,
}),

  });

  const data = await response.json();

  if (!response.ok || data.ok !== true) {
    throw new Error(
      data.error || `Upload request failed (HTTP ${response.status})`
    );
  }

  if (!data.uploadUrl || !data.bookId || !data.objectKey) {
    throw new Error("Invalid upload URL response from Academic Books API");
  }

  return {
    uploadUrl: data.uploadUrl,
    bookId: data.bookId,
    objectKey: data.objectKey,
    expiresIn: data.expiresIn,
  };
}
/**
 * Upload an academic book PDF or PowerPoint directly to S3.
 * The presigned URL is obtained from requestAcademicBookUploadUrl().
 */
export async function uploadAcademicBookPdf({
  uploadUrl,
  file,
}) {
  if (!uploadUrl) {
    throw new Error("The academic book upload URL is missing.");
  }

  if (!file) {
    throw new Error("Please select a PDF or PowerPoint file.");
  }

  const extension = String(file.name || "")
    .toLowerCase()
    .split(".")
    .pop();

  const contentTypes = {
    pdf: "application/pdf",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };

  const contentType = contentTypes[extension];

  if (!contentType) {
    throw new Error("Only PDF and PowerPoint files are allowed.");
  }

  if (file.size <= 0 || file.size > 25 * 1024 * 1024) {
    throw new Error("The selected file must be between 1 byte and 25 MB.");
  }

  /*const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });*/
const bookId = new URL(uploadUrl).pathname
  .split("/")
  .pop()
  ?.replace(/\.(pdf|ppt|pptx)$/i, "");

const contentDisposition =
  extension === "pdf"
    ? "inline"
    : `attachment; filename="${bookId}.${extension}"`;

const response = await fetch(uploadUrl, {
  method: "PUT",
  headers: {
    "Content-Type": contentType,
    "Content-Disposition": contentDisposition,
  },
  body: file,
});

  if (!response.ok) {
    throw new Error(
      `Academic book upload failed (HTTP ${response.status})`
    );
  }

  return { ok: true };
}
/**
 * Publish an uploaded academic book.
 * The backend verifies the uploaded PDF before saving metadata.
 */
export async function publishAcademicBook({
  bookId,
  objectKey,
  coverKey,
  title,
  author,
  subject,
  subcategory,
  description,
  accessToken,
}) {
  if (!API_BASE) {
    throw new Error("VITE_ACADEMIC_BOOKS_API_BASE is not configured");
  }

  if (!accessToken) {
    throw new Error("Please log in before sharing an academic book.");
  }

  const response = await fetch(`${API_BASE}/books`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "st-auth-mode": "header",
    },
  body: JSON.stringify({
  bookId,
  objectKey,
  ...(coverKey ? { coverKey } : {}),
  title,
  author,
  subject,
  subcategory,
  description,
}),
  });

  const data = await response.json();

  if (!response.ok || data.ok !== true) {
    throw new Error(
      data.error || `Book publishing failed (HTTP ${response.status})`
    );
  }

  return data;
}
/**
 * Request a presigned S3 URL for an academic book cover.
 *
 * The PDF must already have been uploaded to S3.
 * Requires an authenticated SuperTokens access token.
 */
export async function requestAcademicBookCoverUploadUrl({
  bookId,
  fileSize,
  accessToken,
}) {
  if (!API_BASE) {
    throw new Error("VITE_ACADEMIC_BOOKS_API_BASE is not configured");
  }

  if (!accessToken) {
    throw new Error("Please log in before uploading a book cover.");
  }

  if (!bookId) {
    throw new Error("Academic book ID is missing.");
  }

  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > 1024 * 1024) {
    throw new Error("The book cover must be smaller than 1 MB.");
  }

  const response = await fetch(`${API_BASE}/books/cover-upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "st-auth-mode": "header",
    },
    body: JSON.stringify({
      bookId,
      fileSize,
      contentType: "image/jpeg",
    }),
  });

  const data = await response.json();

  if (!response.ok || data.ok !== true) {
    throw new Error(
      data.error || `Cover upload request failed (HTTP ${response.status})`
    );
  }

  if (!data.uploadUrl || !data.coverKey) {
    throw new Error("Invalid cover upload response from Academic Books API");
  }

  return {
    uploadUrl: data.uploadUrl,
    coverKey: data.coverKey,
    bookId: data.bookId,
    expiresIn: data.expiresIn,
  };
}

/**
 * Upload a generated JPEG cover directly to private S3.
 *
 * The presigned URL comes from
 * requestAcademicBookCoverUploadUrl().
 */
export async function uploadAcademicBookCover({
  uploadUrl,
  coverBlob,
}) {
  if (!uploadUrl) {
    throw new Error("The book cover upload URL is missing.");
  }

  if (!(coverBlob instanceof Blob)) {
    throw new Error("The generated book cover is invalid.");
  }

  if (coverBlob.type !== "image/jpeg") {
    throw new Error("Only JPEG book covers are allowed.");
  }

  if (coverBlob.size <= 0 || coverBlob.size > 1024 * 1024) {
    throw new Error("The book cover must be smaller than 1 MB.");
  }

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg",
    },
    body: coverBlob,
  });

  if (!response.ok) {
    throw new Error(
      `Academic book cover upload failed (HTTP ${response.status})`
    );
  }

  return { ok: true };
}

/**
 * Request a temporary, authenticated PDF reading URL.
 * The PDF remains in the private S3 bucket.
 */
export async function requestAcademicBookReadUrl({
  bookId,
  accessToken,
}) {
  if (!API_BASE) {
    throw new Error("VITE_ACADEMIC_BOOKS_API_BASE is not configured");
  }

  if (!bookId) {
    throw new Error("Academic book ID is missing.");
  }

  if (!accessToken) {
    throw new Error("Please log in to read this academic book.");
  }

  const response = await fetch(
    `${API_BASE}/books/${encodeURIComponent(bookId)}/read-url`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "st-auth-mode": "header",
      },
    }
  );

  const data = await response.json();

  if (!response.ok || data.ok !== true) {
    throw new Error(
      data.error || `Unable to open book (HTTP ${response.status})`
    );
  }

  if (!data.readUrl) {
    throw new Error("The PDF reading URL is missing.");
  }

  return {
    readUrl: data.readUrl,
    expiresIn: data.expiresIn,
  };
}
/**
 * Retrieve academic books shared by the logged-in user.
 * Uses the authenticated GET /books/my-shared endpoint.
 * Supports cursor-based pagination.
 */
export async function fetchMySharedAcademicBooks({
  limit = 20,
  cursor = null,
  accessToken,
} = {}) {
  if (!API_BASE) {
    throw new Error("VITE_ACADEMIC_BOOKS_API_BASE is not configured");
  }

  if (!accessToken) {
    throw new Error("Please log in to view your shared books.");
  }

  const url = new URL(`${API_BASE}/books/my-shared`);

  url.searchParams.set("limit", String(limit));

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "st-auth-mode": "header",
    },
  });

  const data = await response.json();

  if (!response.ok || data.ok !== true) {
    throw new Error(
      data.error ||
        `Unable to retrieve shared books (HTTP ${response.status})`
    );
  }

  if (!Array.isArray(data.books)) {
    throw new Error("Invalid My Shared Books API response");
  }

  return {
    books: data.books,
    cursor: data.cursor ?? null,
  };
}
/**
 * Retrieve academic books saved by the logged-in user.
 * Uses GET /books/saved with SuperTokens authentication.
 * Supports cursor-based pagination.
 */
export async function fetchSavedAcademicBooks({
  limit = 20,
  cursor = null,
  accessToken,
} = {}) {
  if (!API_BASE) {
    throw new Error("VITE_ACADEMIC_BOOKS_API_BASE is not configured");
  }

  if (!accessToken) {
    throw new Error("Please log in to view your saved books.");
  }

  const url = new URL(`${API_BASE}/books/saved`);

  url.searchParams.set("limit", String(limit));

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "st-auth-mode": "header",
    },
  });

  const data = await response.json();

  if (!response.ok || data.ok !== true) {
    throw new Error(
      data.error ||
        `Unable to retrieve saved books (HTTP ${response.status})`
    );
  }

  if (!Array.isArray(data.books)) {
    throw new Error("Invalid Saved Books API response");
  }

  return {
    books: data.books,
    cursor: data.cursor ?? null,
  };
}

export async function saveAcademicBook({ bookId, accessToken }) {
  if (!API_BASE) {
    throw new Error("VITE_ACADEMIC_BOOKS_API_BASE is not configured");
  }

  if (!accessToken) {
    throw new Error("Please log in to save academic books.");
  }

  if (!bookId) {
    throw new Error("Academic book ID is required.");
  }

  const response = await fetch(
    `${API_BASE}/books/${encodeURIComponent(bookId)}/save`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "st-auth-mode": "header",
      },
    }
  );

  const data = await response.json();

  if (!response.ok || data.ok !== true) {
    throw new Error(
      data.error || `Unable to save academic book (HTTP ${response.status})`
    );
  }

  return data;
}
export async function unsaveAcademicBook({ bookId, accessToken }) {
  if (!API_BASE) {
    throw new Error("VITE_ACADEMIC_BOOKS_API_BASE is not configured");
  }

  if (!accessToken) {
    throw new Error("Please log in to remove saved books.");
  }

  if (!bookId) {
    throw new Error("Academic book ID is required.");
  }

  const response = await fetch(
    `${API_BASE}/books/${encodeURIComponent(bookId)}/save`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "st-auth-mode": "header",
      },
    }
  );

  const data = await response.json();

  if (!response.ok || data.ok !== true) {
    throw new Error(
      data.error ||
        `Unable to remove saved academic book (HTTP ${response.status})`
    );
  }

  return data;
}