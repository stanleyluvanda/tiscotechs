// src/utils/internationalStudentNewsApi.js

const RAW_API_BASE =
  (import.meta?.env?.VITE_NEWS_API_BASE &&
    String(
      import.meta.env.VITE_NEWS_API_BASE
    ).trim()) ||
  (import.meta?.env?.VITE_API_BASE &&
    String(
      import.meta.env.VITE_API_BASE
    ).trim()) ||
  "";

const API_BASE =
  RAW_API_BASE.replace(/\/+$/, "");

const IS_PROD =
  Boolean(import.meta?.env?.PROD);

const ADMIN_NEWS_STATUSES =
  new Set([
    "pending",
    "approved",
    "rejected",
  ]);

async function apiFetch(
  path,
  options = {}
) {
  if (!API_BASE) {
    if (IS_PROD) {
      throw new Error(
        "News API base is missing in production. Set VITE_NEWS_API_BASE."
      );
    }

    throw new Error(
      "News API base is missing. Set VITE_NEWS_API_BASE."
    );
  }

  const url =
    `${API_BASE}${
      path.startsWith("/")
        ? path
        : `/${path}`
    }`;

  try {
    const response =
      await fetch(url, options);

    const data =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        `News request failed with HTTP ${response.status}`;

      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.warn(
      "[internationalStudentNewsApi]",
      error
    );

    throw error;
  }
}

/**
 * Public news listing.
 *
 * The backend always returns approved records only.
 */
export async function listInternationalStudentNews({
  q = "",
  limit = 20,
  cursor = "",
} = {}) {
  const params =
    new URLSearchParams();

  if (q) {
    params.set("q", String(q));
  }

  if (limit) {
    params.set(
      "limit",
      String(limit)
    );
  }

  if (cursor) {
    params.set(
      "cursor",
      String(cursor)
    );
  }

  const query =
    params.toString();

  return apiFetch(
    `/api/news${
      query ? `?${query}` : ""
    }`,
    {
      method: "GET",
    }
  );
}

/**
 * Admin news listing.
 */
export async function listAdminInternationalStudentNews({
  status = "pending",
  limit = 20,
  cursor = "",
} = {}) {
  const normalizedStatus =
    String(status || "pending")
      .trim()
      .toLowerCase();

  if (
    !ADMIN_NEWS_STATUSES.has(
      normalizedStatus
    )
  ) {
    throw new Error(
      "Admin news status must be pending, approved, or rejected."
    );
  }

  const params =
    new URLSearchParams();

  params.set(
    "status",
    normalizedStatus
  );

  if (limit) {
    params.set(
      "limit",
      String(limit)
    );
  }

  if (cursor) {
    params.set(
      "cursor",
      String(cursor)
    );
  }

  const query =
    params.toString();

  return apiFetch(
    `/api/news/admin${
      query ? `?${query}` : ""
    }`,
    {
      method: "GET",
      cache: "no-store",

      headers: {
        "Cache-Control":
          "no-cache",
      },
    }
  );
}

export async function getInternationalStudentNewsBySlug(
  slug
) {
  const normalizedSlug =
    String(slug || "").trim();

  if (!normalizedSlug) {
    throw new Error(
      "News slug is required."
    );
  }

  return apiFetch(
    `/api/news/${encodeURIComponent(
      normalizedSlug
    )}`,
    {
      method: "GET",
    }
  );
}

export async function createInternationalStudentNews(
  payload
) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(
      "A valid news article payload is required."
    );
  }

  return apiFetch(
    "/api/news",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        ...payload,
        status: "pending",
      }),
    }
  );
}

export async function updateInternationalStudentNews(
  id,
  patch
) {
  const normalizedId =
    String(id || "").trim();

  if (!normalizedId) {
    throw new Error(
      "News ID is required."
    );
  }

  if (
    !patch ||
    typeof patch !== "object" ||
    Array.isArray(patch)
  ) {
    throw new Error(
      "A valid news update is required."
    );
  }

  return apiFetch(
    `/api/news/${encodeURIComponent(
      normalizedId
    )}`,
    {
      method: "PUT",

      cache: "no-store",

      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-cache",
      },

      body:
        JSON.stringify(patch),
    }
  );
}

export async function deleteInternationalStudentNews(
  id
) {
  const normalizedId =
    String(id || "").trim();

  if (!normalizedId) {
    throw new Error(
      "News ID is required."
    );
  }

  return apiFetch(
    `/api/news/${encodeURIComponent(
      normalizedId
    )}`,
    {
      method: "DELETE",
      cache: "no-store",

      headers: {
        "Cache-Control":
          "no-cache",
      },
    }
  );
}