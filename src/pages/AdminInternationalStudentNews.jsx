// src/pages/AdminInternationalStudentNews.jsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useNoIndex from "../lib/useNoIndex";
import {
  deleteInternationalStudentNews,
  listAdminInternationalStudentNews,
  updateInternationalStudentNews,
} from "../utils/internationalStudentNewsApi";

const CATEGORY_OPTIONS = [
  "all",
  "Visa & Immigration",
  "University Admissions",
  "Scholarships & Funding",
  "Work Rights",
  "Post-study Work",
  "Tuition & Costs",
  "Student Safety",
  "Education Policy",
];
const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Pending approval",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
];

function statusClasses(status) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "border-green-200 bg-green-50 text-green-700";

    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";

    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-700";

    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function importanceClasses(importance) {
  switch (String(importance || "").toLowerCase()) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";

    case "important":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizeArticle(item) {
  return {
    ...item,

    id:
      item?.id ||
      item?.newsId ||
      String(item?.pk || "").replace(/^NEWS#/, ""),

    title:
      item?.title ||
      item?.headline ||
      "Untitled article",

    excerpt:
      item?.excerpt ||
      item?.summary ||
      "",

    image:
      item?.image ||
      item?.imageUrl ||
      item?.featuredImage ||
      "",

    country:
      item?.country ||
      "Global",

    category:
      item?.category ||
      "International Education",

    importance:
      item?.importance ||
      "Information",

    status:
      String(item?.status || "pending").toLowerCase(),

    publishedBy:
      item?.publishedBy ||
      item?.publisherName ||
      item?.organization ||
      item?.partnerEmail ||
      item?.createdBy ||
      "ScholarsKnowledge",

    submittedAt:
      item?.submittedAt ||
      item?.createdAt ||
      item?.updatedAt ||
      "",
  };
}

function extractItems(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.news)) {
    return response.news;
  }

  if (Array.isArray(response?.articles)) {
    return response.articles;
  }

  return [];
}

function extractCursor(response) {
  return (
    response?.nextCursor ||
    response?.cursor ||
    response?.nextToken ||
    ""
  );
}

export default function AdminInternationalStudentNews() {
  useNoIndex();

  const [items, setItems] = useState([]);
const [search, setSearch] = useState("");
const [category, setCategory] = useState("all");

const [status, setStatus] = useState("pending");

const [previewItem, setPreviewItem] = useState(null);

const [actionId, setActionId] = useState("");

const [actionError, setActionError] = useState("");

const [loading, setLoading] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
const [error, setError] = useState("");
const [nextCursor, setNextCursor] = useState("");

  async function loadInitialArticles() {
    setLoading(true);
    setError("");

    try {
      const response =
        await listAdminInternationalStudentNews({
         status,
          limit: 20,
        });

      const loadedItems =
        extractItems(response).map(normalizeArticle);

      setItems(loadedItems);
      setNextCursor(extractCursor(response));
    } catch (requestError) {
      setItems([]);
      setNextCursor("");

      setError(
        requestError?.message ||
          "Failed to load pending news articles."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreArticles() {
    if (!nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError("");

    try {
      const response =
        await listAdminInternationalStudentNews({
         status,
          limit: 20,
          cursor: nextCursor,
        });

      const loadedItems =
        extractItems(response).map(normalizeArticle);

      setItems((currentItems) => {
        const existingIds = new Set(
          currentItems.map((item) => String(item.id))
        );

        const uniqueNewItems = loadedItems.filter(
          (item) =>
            !existingIds.has(String(item.id))
        );

        return [
          ...currentItems,
          ...uniqueNewItems,
        ];
      });

      setNextCursor(extractCursor(response));
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Failed to load additional news articles."
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function changeArticleStatus(
  item,
  nextStatus
) {
  if (!item?.id || actionId) {
    return;
  }

  setActionId(String(item.id));
  setActionError("");

  try {
    await updateInternationalStudentNews(
      item.id,
      {
        status: nextStatus,
      }
    );

    setPreviewItem(null);

    await loadInitialArticles();
  } catch (requestError) {
    setActionError(
      requestError?.message ||
        "Failed to update the news article."
    );
  } finally {
    setActionId("");
  }
}

async function removeArticle(item) {
  if (!item?.id || actionId) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete "${item.title}"? This cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  setActionId(String(item.id));
  setActionError("");

  try {
    await deleteInternationalStudentNews(
      item.id
    );

    setPreviewItem(null);

    setItems((currentItems) =>
      currentItems.filter(
        (currentItem) =>
          String(currentItem.id) !==
          String(item.id)
      )
    );
  } catch (requestError) {
    setActionError(
      requestError?.message ||
        "Failed to delete the news article."
    );
  } finally {
    setActionId("");
  }
}

  useEffect(() => {
  loadInitialArticles();
}, [status]);

  const filteredItems = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return items.filter((item) => {
      const searchableValues = [
        item.title,
        item.excerpt,
        item.country,
        item.category,
        item.publishedBy,
      ];

      const matchesSearch =
        !normalizedSearch ||
        searchableValues.some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedSearch)
        );

      const matchesCategory =
        category === "all" ||
        item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [items, search, category]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              International Student News
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review international student news articles
              submitted for approval. Approved articles will
              become visible on the public news page.
            </p>
          </div>

          <button
            type="button"
            disabled
            title="Article creation will be connected later."
            className="rounded-lg bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            + New Article
          </button>
        </div>

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  News management
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Showing {status} international student news articles.
                </p>
              </div>

              {!loading && !error ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  {items.length} loaded
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-slate-200 px-5 py-4 md:grid-cols-3">
            <label className="block">
              <span className="sr-only">
                Search news
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by headline, country, or category..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="sr-only">
                Status
              </span>

              <select
  value={status}
  onChange={(event) =>
    setStatus(event.target.value)
  }
  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
>
  {STATUS_OPTIONS.map((option) => (
    <option
      key={option.value}
      value={option.value}
    >
      {option.label}
    </option>
  ))}
</select>
            </label>

            <label className="block">
              <span className="sr-only">
                Filter by category
              </span>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option === "all"
                      ? "All categories"
                      : option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {actionError ? (
            <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}

          {loading ? (
            <div className="px-5 py-14 text-center text-sm text-slate-600">
              Loading pending news articles...
            </div>
          ) : error ? (
            <div className="px-5 py-12 text-center">
              <h3 className="text-base font-semibold text-red-700">
                News articles could not be loaded
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                {error}
              </p>

              <button
                type="button"
                onClick={loadInitialArticles}
                className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Retry
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <h3 className="text-base font-semibold text-slate-900">
                No {status} news articles found
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                No {status} articles match the current
                search or category filter.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {filteredItems.map((item) => (
                  <article
                    key={item.id}
                    className="grid grid-cols-1 gap-4 px-5 py-5 lg:grid-cols-[120px_minmax(0,1fr)_auto]"
                  >
                    <div className="overflow-hidden rounded-lg bg-slate-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          className="h-24 w-full object-cover lg:h-full"
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center px-3 text-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-slate-950">
                        {item.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${importanceClasses(
                            item.importance
                          )}`}
                        >
                          {item.importance}
                        </span>

                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                          {item.country}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                          {item.category}
                        </span>
                      </div>

                      {item.excerpt ? (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                          {item.excerpt}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        {item.submittedAt ? (
                          <span>
                            Submitted{" "}
                            {formatDate(item.submittedAt)}
                          </span>
                        ) : null}

                        <span>{item.publishedBy}</span>
                      </div>
                    </div>

  <div className="flex flex-wrap items-start gap-2 lg:flex-col">
  <button
    type="button"
    onClick={() =>
      setPreviewItem(item)
    }
    className="rounded border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
  >
    Preview
  </button>

  {item.status !== "approved" ? (
    <button
      type="button"
      onClick={() =>
        changeArticleStatus(
          item,
          "approved"
        )
      }
      disabled={
        actionId ===
        String(item.id)
      }
      className="rounded border border-green-300 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
    >
      Approve
    </button>
  ) : null}

  {item.status !== "rejected" ? (
    <button
      type="button"
      onClick={() =>
        changeArticleStatus(
          item,
          "rejected"
        )
      }
      disabled={
        actionId ===
        String(item.id)
      }
      className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      Reject
    </button>
  ) : null}

  {item.status !== "pending" ? (
    <button
      type="button"
      onClick={() =>
        changeArticleStatus(
          item,
          "pending"
        )
      }
      disabled={
        actionId ===
        String(item.id)
      }
      className="rounded border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
    >
      Mark Pending
    </button>
  ) : null}

  <button
    type="button"
    disabled
    title="The news editing form has not been connected yet."
    className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-400"
  >
    Edit
  </button>

  <button
    type="button"
    onClick={() =>
      removeArticle(item)
    }
    disabled={
      actionId ===
      String(item.id)
    }
    className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
  >
    Delete
  </button>
</div>
                  </article>
                ))}
              </div>

              {nextCursor ? (
                <div className="border-t border-slate-200 px-5 py-4 text-center">
                  <button
                    type="button"
                    onClick={loadMoreArticles}
                    disabled={loadingMore}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {loadingMore
                      ? "Loading..."
                      : "Load more"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <div className="mt-6">
          <Link
            to="/admin/dashboard"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
      {previewItem ? (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="news-preview-title"
  >
    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Article preview
          </p>

          <h2
            id="news-preview-title"
            className="mt-1 text-xl font-bold text-slate-950"
          >
            {previewItem.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={() =>
            setPreviewItem(null)
          }
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      {previewItem.image ? (
        <img
          src={previewItem.image}
          alt=""
          className="max-h-96 w-full object-cover"
        />
      ) : null}

      <div className="px-5 py-5">
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
              previewItem.status
            )}`}
          >
            {previewItem.status}
          </span>

          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${importanceClasses(
              previewItem.importance
            )}`}
          >
            {previewItem.importance}
          </span>

          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
            {previewItem.country}
          </span>

          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
            {previewItem.category}
          </span>
        </div>

        {previewItem.excerpt ? (
          <p className="mt-5 text-base leading-7 text-slate-700">
            {previewItem.excerpt}
          </p>
        ) : null}

        {previewItem.articleHtml ? (
          <div
            className="prose prose-slate mt-6 max-w-none"
            dangerouslySetInnerHTML={{
              __html:
                previewItem.articleHtml,
            }}
          />
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            No article content was provided.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
          {previewItem.status !==
          "approved" ? (
            <button
              type="button"
              onClick={() =>
                changeArticleStatus(
                  previewItem,
                  "approved"
                )
              }
              disabled={
                actionId ===
                String(
                  previewItem.id
                )
              }
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              Approve
            </button>
          ) : null}

          {previewItem.status !==
          "rejected" ? (
            <button
              type="button"
              onClick={() =>
                changeArticleStatus(
                  previewItem,
                  "rejected"
                )
              }
              disabled={
                actionId ===
                String(
                  previewItem.id
                )
              }
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              Reject
            </button>
          ) : null}

          {previewItem.status !==
          "pending" ? (
            <button
              type="button"
              onClick={() =>
                changeArticleStatus(
                  previewItem,
                  "pending"
                )
              }
              disabled={
                actionId ===
                String(
                  previewItem.id
                )
              }
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Mark Pending
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              removeArticle(
                previewItem
              )
            }
            disabled={
              actionId ===
              String(
                previewItem.id
              )
            }
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
) : null}
    </main>
  );
}