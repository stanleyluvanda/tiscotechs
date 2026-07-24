import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listInternationalStudentNews } from "../utils/internationalStudentNewsApi";
import Footer from "../components/Footer";

const COUNTRY_OPTIONS = [
  "All Countries",
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Ireland",
  "New Zealand",
  "Global",
];

const CATEGORY_OPTIONS = [
  "All Categories",
  "Visa & Immigration",
  "University Admissions",
  "Scholarships & Funding",
  "Work Rights",
  "Post-study Work",
  "Tuition & Costs",
  "Student Safety",
  "Education Policy",
  "International Education",
];

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function normalizeArticle(item) {
  return {
    id:
      item?.id ||
      item?.newsId ||
      String(item?.pk || "").replace(/^NEWS#/, ""),

    slug: item?.slug || "",

    title:
      item?.title ||
      item?.headline ||
      "Untitled news article",

    excerpt: item?.excerpt || "",

    country: item?.country || "Global",

    region: item?.region || "",

    category:
      item?.category ||
      "International Education",

    importance:
      item?.importance ||
      "Information",

    image:
      item?.imageUrl ||
      item?.image ||
      item?.featuredImage ||
      "",

    publishedAt:
      item?.publishedAt ||
      item?.createdAt ||
      "",

    publishedBy:
      item?.publishedBy ||
      "ScholarsKnowledge",

    tags: Array.isArray(item?.tags)
      ? item.tags
      : [],
  };
}

function extractItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.news)) return response.news;
  if (Array.isArray(response?.articles)) return response.articles;

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

export default function InternationalStudentNews() {
  const [allNews, setAllNews] = useState([]);

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All Countries");
  const [category, setCategory] = useState("All Categories");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState("");

  async function loadInitialNews() {
    setLoading(true);
    setError("");

    try {
      const response = await listInternationalStudentNews({
        status: "published",
        limit: 20,
      });

      const items = extractItems(response).map(normalizeArticle);

      setAllNews(items);
      setNextCursor(extractCursor(response));
    } catch (requestError) {
      setAllNews([]);
      setNextCursor("");

      setError(
        requestError?.message ||
          "Published news could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreNews() {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setError("");

    try {
      const response = await listInternationalStudentNews({
        status: "published",
        limit: 20,
        cursor: nextCursor,
      });

      const newItems = extractItems(response).map(normalizeArticle);

      setAllNews((currentItems) => {
        const existingIds = new Set(
          currentItems.map((item) => String(item.id))
        );

        const uniqueItems = newItems.filter(
          (item) => !existingIds.has(String(item.id))
        );

        return [...currentItems, ...uniqueItems];
      });

      setNextCursor(extractCursor(response));
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Additional news could not be loaded."
      );
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadInitialNews();
  }, []);

  const filteredNews = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allNews.filter((article) => {
      const searchableValues = [
        article.title,
        article.excerpt,
        article.country,
        article.region,
        article.category,
        article.publishedBy,
        ...article.tags,
      ];

      const matchesSearch =
        !normalizedSearch ||
        searchableValues.some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedSearch)
        );

      const matchesCountry =
        country === "All Countries" ||
        article.country === country;

      const matchesCategory =
        category === "All Categories" ||
        article.category === category;

      return matchesSearch && matchesCountry && matchesCategory;
    });
  }, [allNews, search, country, category]);

  const leadArticle = filteredNews[0];

  function clearFilters() {
    setSearch("");
    setCountry("All Countries");
    setCategory("All Categories");
  }

          return (
            <>
  <main className="min-h-screen bg-white">
    {/* Top editorial frame */}
    <section className="bg-white pb-0 pt-4">

  {/* Full-width Hero */}
<div
  className="relative w-full overflow-hidden"
  style={{
    backgroundImage: "url('/images/international-student-news-banner.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
  {/* Dark overlay for text readability */}
  <div className="absolute inset-0 bg-slate-950/55" />

  <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8">
    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
      ScholarsKnowledge
    </p>

    <h1 className="mt-3 max-w-3xl text-4xl font-extrabold text-white md:text-5xl">
      International Student News
    </h1>

    <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">
      Stay informed with trusted news, visa updates, scholarships,
      university announcements, and opportunities for international students.
    </p>
  </div>
</div>

  {/* Main content */}
  <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-8 lg:px-12">

    {/* Advertisement */}
    <div className="mx-auto max-w-5xl">
      <p className="text-center text-xs text-slate-400">
        Advertisement
      </p>

      <div className="mt-3 flex min-h-[220px] items-center justify-center bg-slate-50 sm:min-h-[300px]">
        <span className="text-sm text-slate-300">
          Advertisement
        </span>
      </div>
    </div>

          {/* News heading */}
          {/* News heading */}
<div className="mt-10">
  <h1 className="text-4xl font-bold tracking-tight text-center text-slate-900 sm:text-5xl">
    News & Updates for International Students
  </h1>
</div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(180px,0.8fr)_minmax(210px,0.9fr)_auto] md:items-end">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Search
                </span>

                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
                    aria-hidden="true"
                  >
                    ⌕
                  </span>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search news..."
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Country
                </span>

                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Category
                </span>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={clearFilters}
                disabled={
                  !search &&
                  country === "All Countries" &&
                  category === "All Categories"
                }
                className="h-10 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-default disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </section>

       {/* Main news content */}
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {loading ? (
          <div className="border-y border-slate-200 px-6 py-16 text-center">
            <p className="text-sm text-slate-600">
              Loading international student news...
            </p>
          </div>
        ) : error && allNews.length === 0 ? (
          <div className="border-y border-red-200 px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-red-700">
              News could not be loaded
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadInitialNews}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : !leadArticle ? (
          <div className="border-y border-slate-200 px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              No news articles found
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Change the search term or selected filters.
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[960px]">
            {/* Centered news feed */}
            <div className="min-w-0 border-x border-slate-200 bg-white px-4 sm:px-6">
              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {filteredNews.map((article) => (
                  <article
                    key={article.id}
                    className="grid grid-cols-1 gap-5 py-6 sm:grid-cols-[250px_minmax(0,1fr)] sm:gap-6"
                  >
                    {/* Article image */}
                    <Link
                      to={`/international-student-news/${article.slug}`}
                      className="block aspect-[16/10] overflow-hidden rounded-sm bg-slate-100 sm:aspect-auto sm:h-[200px]"
                    >
                      {article.image ? (
                        <img
                          src={article.image}
                          alt={`${article.title} article image`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-full min-h-[150px] w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
                          No article image
                        </div>
                      )}
                    </Link>

                    {/* Article text */}
                    <div className="flex min-w-0 flex-col">
                      <p className="text-xs font-semibold text-slate-700">
                        <span className="border-b border-slate-400 pb-1">
                          {article.category}
                        </span>
                      </p>

                      <h2 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
                        <Link
                          to={`/international-student-news/${article.slug}`}
                          className="hover:text-blue-700"
                        >
                          {article.title}
                        </Link>
                      </h2>

                      {article.excerpt ? (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                          {article.excerpt}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {formatDate(article.publishedAt) ? (
                          <span>{formatDate(article.publishedAt)}</span>
                        ) : null}

                        {formatDate(article.publishedAt) &&
                        article.publishedBy ? (
                          <span aria-hidden="true">•</span>
                        ) : null}

                        {article.publishedBy ? (
                          <span>{article.publishedBy}</span>
                        ) : null}
                      </div>

                      {/*</div><div className="mt-auto flex items-end justify-between gap-4 pt-4">*/}
                        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                        <Link
                          to={`/international-student-news/${article.slug}`}
                          className="inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900"
                        >
                          Read full story
                          <span className="ml-2" aria-hidden="true">
                            →
                          </span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            const articleUrl = `${window.location.origin}/international-student-news/${article.slug}`;

                            if (navigator.share) {
                              navigator
                                .share({
                                  title: article.title,
                                  text: article.excerpt || article.title,
                                  url: articleUrl,
                                })
                                .catch(() => {});
                              return;
                            }

                            navigator.clipboard
                              ?.writeText(articleUrl)
                              .catch(() => {});
                          }}
                          className="hidden shrink-0 items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-700 sm:inline-flex"
                          aria-label={`Share ${article.title}`}
                        >
                          <span className="mr-1.5" aria-hidden="true">
                            ↗
                          </span>
                          Share
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Preserve a load-more error without replacing loaded articles */}
              {error && allNews.length > 0 ? (
                <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {nextCursor ? (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={loadMoreNews}
                    disabled={loadingMore}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {loadingMore
                      ? "Loading..."
                      : "Load more news"}
                  </button>
                </div>
              ) : null}
            </div>

          </div>
        )}
      </section>
   </main>

    {/* Pre-footer editorial section */}
    <section className="border-t-2 border-slate-800 bg-slate-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-14 md:grid-cols-3 lg:px-8 lg:py-16">
        {/* Browse news */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-slate-600">
            Browse News and Articles
          </h2>

          <nav className="mt-7 space-y-5" aria-label="News categories">
            <button
              type="button"
              onClick={() => {
                setCategory("Visa & Immigration");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="block text-left text-base text-slate-900 hover:text-blue-700"
            >
              Visa &amp; Immigration
            </button>

            <button
              type="button"
              onClick={() => {
                setCategory("University Admissions");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="block text-left text-base text-slate-900 hover:text-blue-700"
            >
              University Admissions
            </button>

            <button
              type="button"
              onClick={() => {
                setCategory("Scholarships & Funding");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="block text-left text-base text-slate-900 hover:text-blue-700"
            >
              Scholarships &amp; Funding
            </button>

            <button
              type="button"
              onClick={() => {
                setCategory("Work Rights");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="block text-left text-base text-slate-900 hover:text-blue-700"
            >
              Work Rights
            </button>

            <button
              type="button"
              onClick={() => {
                setCategory("Post-study Work");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="block text-left text-base text-slate-900 hover:text-blue-700"
            >
              Post-study Work
            </button>
          </nav>
        </div>

        {/* Share page */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-slate-600">
            Share This Page
          </h2>

          <div className="mt-7 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(window.location.href)
                  .catch(() => {});
              }}
              aria-label="Copy page link"
              title="Copy page link"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 text-xl text-slate-700 transition hover:border-blue-700 hover:text-blue-700"
            >
              🔗
            </button>

            <a
              href={`mailto:?subject=${encodeURIComponent(
                "International Student News | ScholarsKnowledge"
              )}&body=${encodeURIComponent(
                "Read the latest international student news: " +
                  window.location.href
              )}`}
              aria-label="Share by email"
              title="Share by email"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 text-xl text-slate-700 transition hover:border-blue-700 hover:text-blue-700"
            >
              ✉
            </a>
          </div>
        </div>

        {/* ScholarsKnowledge information */}
        <div className="md:text-center">
          <Link
            to="/"
            className="inline-block font-serif text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl"
          >
            Scholars<span className="text-orange-500">Knowledge</span>
          </Link>

          <p className="mx-auto mt-6 max-w-md text-base leading-8 text-slate-600">
            Helping international students discover verified news,
            scholarships, fellowships, funded graduate opportunities, and
            expert application guidance.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 md:justify-center">
            <Link
              to="/privacy-policy"
              className="text-sm text-slate-600 hover:text-blue-700"
            >
              Privacy Policy
            </Link>

            <Link
              to="/terms-of-use"
              className="text-sm text-slate-600 hover:text-blue-700"
            >
              Terms of Use
            </Link>

            <Link
              to="/contact"
              className="text-sm text-slate-600 hover:text-blue-700"
            >
              Contact
            </Link>
          </div>

          <p className="mt-9 text-sm text-slate-500">
            © {new Date().getFullYear()} ScholarsKnowledge. All rights reserved.
          </p>
        </div>
      </div>
    </section>

    <Footer />
  </>
);
}