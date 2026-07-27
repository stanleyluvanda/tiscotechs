// src/pages/InternationalStudentNewsDetail.jsx

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getInternationalStudentNewsBySlug } from "../utils/internationalStudentNewsApi";
import Footer from "../components/Footer";
import GoogleInArticleAd from "../components/GoogleInArticleAd";

const relatedGuides = [
  {
    title:
      "How to Write and Structure a Winning Statement of Purpose",
    category: "Application Documents",
    emoji: "📝",
    time: "12 min read",
    link: "/scholarship-tips/how-to-write-winning-sop",
  },
  {
    title: "How to Get Strong Recommendation Letters",
    category: "Letters & References",
    emoji: "📬",
    time: "9 min read",
    link: "/scholarship-tips/recommendation-letters",
  },
  {
    title: "How to Write a Research Proposal",
    category: "Research Writing",
    emoji: "🔬",
    time: "11 min read",
    link: "/scholarship-tips/research-proposal#what",
  },
  {
    title: "How to Write a Winning Scholarship CV",
    category: "Application Documents",
    emoji: "📄",
    time: "8 min read",
    link: "/scholarship-tips/scholarship-cv#difference",
  },
  {
    title: "Scholarship Interview Questions & Answers",
    category: "Interview Preparation",
    emoji: "🎤",
    time: "13 min read",
    link: "/scholarship-tips/interview-preparation",
  },
  {
    title: "Fully Funded Master’s and PhD Application Guide",
    category: "Planning",
    emoji: "🎓",
    time: "15 min read",
    link: "/scholarship-tips/fully-funded-masters-phd-guide",
  },
  {
    title:
      "What Is a Fellowship? A Complete Guide for International Students",
    category: "Fellowships",
    emoji: "🏆",
    time: "14 min read",
    link: "/fellowship-guide#find",
  },
  {
    title:
      "Staying on Track Abroad: What International Students Should Know",
    category: "Study Abroad",
    emoji: "🌍",
    time: "14 min read",
    link: "/scholarship-tips/staying-on-track-abroad",
  },
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

function importanceClasses(importance) {
  switch (String(importance || "").toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700";
    case "important":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function getYouTubeEmbedUrl(value = "") {
  const url = String(value || "").trim();

  if (!url) return "";

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    let videoId = "";

    if (hostname === "youtu.be" || hostname === "www.youtu.be") {
      videoId = pathParts[0] || "";
    } else if (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") || "";
      } else if (
        pathParts[0] === "embed" ||
        pathParts[0] === "shorts" ||
        pathParts[0] === "live"
      ) {
        videoId = pathParts[1] || "";
      }
    }

    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return "";
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return "";
  }
}

function splitArticleIntoBlocks(articleHtml = "") {
  if (!articleHtml || typeof window === "undefined") {
    return [];
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(
    `<div id="article-root">${articleHtml}</div>`,
    "text/html"
  );

  const root = documentNode.getElementById("article-root");

  if (!root) {
    return [];
  }

  return Array.from(root.children)
    .map((element) => {
      const text = element.textContent?.trim() || "";

      if (text === "[[YOUTUBE]]") {
        return {
          type: "youtube",
        };
      }

      return {
        type: "html",
        html: element.outerHTML,
      };
    })
    .filter((block) => {
      if (block.type === "youtube") {
        return true;
      }

      return Boolean(block.html?.trim());
    });
}


function RelatedGuideLinks() {
  return (
    <div className="rounded-md border border-[#DCD4C2] bg-[#F1ECE0] p-5">
      <div className="-mx-5 -mt-5 mb-4 rounded-t-md bg-[#D8CBB3] px-5 py-3">
        <p className="w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A4235]">
          Related guides
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {relatedGuides.map((guide) => (
          <Link
            key={guide.title}
            to={guide.link}
            className="group block border-b border-[#DCD4C2] pb-4 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <span
                className="text-xl"
                aria-hidden="true"
              >
                {guide.emoji}
              </span>

              <div>
                <p className="text-sm font-bold leading-5 text-[#1E2A3D] group-hover:text-[#B6542C]">
                  {guide.title}
                </p>

                <p className="mt-1 text-xs text-[#766F60]">
                  {guide.category} · {guide.time}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}





function normalizeArticle(response) {
  const item = response?.item || response;

  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    id: item.id || "",
    slug: item.slug || "",

    title:
      item.title ||
      item.headline ||
      "Untitled news article",

    excerpt: item.excerpt || "",

    country: item.country || "Global",
    region: item.region || "",
    category:
      item.category ||
      "International Education",

    importance:
      item.importance ||
      "Information",

    imageUrl:
      item.imageUrl ||
      item.image ||
      item.featuredImage ||
      "",

    articleHtml:
      item.articleHtml ||
      item.articleContent ||
      "",

    youtubeUrl:
      item.youtubeUrl ||
      "",

    officialSourceName:
      item.officialSourceName ||
      "",

    officialSourceUrl:
      item.officialSourceUrl ||
      "",

    publishedBy:
      item.publishedBy ||
      "ScholarsKnowledge",

    publishedAt:
      item.publishedAt ||
      item.createdAt ||
      "",

    updatedAt:
      item.updatedAt ||
      item.publishedAt ||
      item.createdAt ||
      "",

    tags: Array.isArray(item.tags)
      ? item.tags
      : [],
  };
}

export default function InternationalStudentNewsDetail() {
  const { slug } = useParams();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const articleBlocks = useMemo(
  () => splitArticleIntoBlocks(article?.articleHtml),
  [article?.articleHtml]
);

const inArticleAdPositions = useMemo(() => {
  const htmlBlockIndexes = articleBlocks
    .map((block, index) =>
      block.type === "html" ? index : null
    )
    .filter((index) => index !== null);

  if (htmlBlockIndexes.length === 0) {
    return new Set();
  }

  const firstPosition =
    htmlBlockIndexes[
      Math.max(
        0,
        Math.ceil(htmlBlockIndexes.length * 0.25) - 1
      )
    ];

  const secondPosition =
    htmlBlockIndexes[
      Math.max(
        0,
        Math.ceil(htmlBlockIndexes.length * 0.65) - 1
      )
    ];

  return new Set(
    [firstPosition, secondPosition].filter(
      (position, index, positions) =>
        Number.isInteger(position) &&
        positions.indexOf(position) === index
    )
  );
}, [articleBlocks]);






  const youtubeEmbedUrl = useMemo(
    () => getYouTubeEmbedUrl(article?.youtubeUrl),
    [article?.youtubeUrl]
  );

  async function loadArticle() {
    setLoading(true);
    setError("");

    try {
      const response =
        await getInternationalStudentNewsBySlug(slug);

      const normalized = normalizeArticle(response);

      if (!normalized) {
        throw new Error(
          "Published news article not found."
        );
      }

      setArticle(normalized);
    } catch (requestError) {
      setArticle(null);
      setError(
        requestError?.message ||
          "The news article could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-slate-600">
          Loading news article...
        </div>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-950">
            News article not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {error ||
              "This article may no longer be available."}
          </p>

          <Link
            to="/international-student-news"
            className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Back to International Student News
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <article>
        {/* Headline area */}
        <header className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-10">
          {/*<header className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">*/}
          <Link
            to="/international-student-news"
            className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            <span className="mr-2" aria-hidden="true">
              ←
            </span>
            International Student News
          </Link>

          <div className="mt-8 flex items-center gap-4">
            <span
              className="h-4 w-4 flex-none rounded-full bg-orange-500"
              aria-hidden="true"
            />

            <span className="text-sm font-bold text-slate-900">
              {formatDate(article.publishedAt)}
            </span>

            <span
              className="h-px flex-1 bg-slate-300"
              aria-hidden="true"
            />
          </div>

          <h1 className="mt-7 max-w-5xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {article.title}
          </h1>

          {article.excerpt ? (
            <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-600">
              {article.excerpt}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            <span className="font-bold text-slate-900">
              By
            </span>

            <span className="border-b-2 border-orange-500 pb-1 text-slate-800">
              {article.publishedBy}
            </span>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${importanceClasses(
                article.importance
              )}`}
            >
              {article.importance}
            </span>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {article.country}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {article.category}
            </span>
          </div>
        </header>

        {/* Article content and sidebar */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <div className="min-w-0">
            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                alt=""
                className="max-h-[620px] w-full object-cover"
              />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center bg-slate-100 text-sm text-slate-400">
                No article image
              </div>
            )}

            <div className="my-8">
  <GoogleInArticleAd />
</div>

            {/*{article.articleHtml ? (
              <div className="mt-10">
                {articleSections.map((sectionHtml, index) => (
                  <div key={`article-section-${index}`}>
                    {sectionHtml.trim() ? (
                      <div
                        className="rich-html text-base leading-8 text-slate-700"
                        dangerouslySetInnerHTML={{
                          __html: sectionHtml,
                        }}
                      />
                    ) : null}

                    {index < articleSections.length - 1 &&
                    youtubeEmbedUrl ? (
                      <div className="my-10">
                        <div className="overflow-hidden bg-black">
                          <iframe
                            src={youtubeEmbedUrl}
                            title={`Related video: ${article.title}`}
                            className="aspect-video w-full"
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                The full article content has not yet been
                added to this test record.
              </div>
            )}*/}

            {article.articleHtml ? (
  <div className="mt-10">
    {articleBlocks.map((block, index) => {
      if (block.type === "youtube") {
        if (!youtubeEmbedUrl) {
          return null;
        }

        return (
          <div
            key={`article-video-${index}`}
            className="my-10"
          >
            <div className="overflow-hidden bg-black">
              <iframe
                src={youtubeEmbedUrl}
                title={`Related video: ${article.title}`}
                className="aspect-video w-full"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        );
      }

      return (
        <div key={`article-block-${index}`}>
          <div
            className="rich-html text-base leading-8 text-slate-700"
            dangerouslySetInnerHTML={{
              __html: block.html,
            }}
          />

          {inArticleAdPositions.has(index) ? (
            <div className="my-10">
              <GoogleInArticleAd />
            </div>
          ) : null}
        </div>
      );
    })}

    {/* In-article ad #3: after the conclusion,
        before the official source and tags */}
    <div className="my-10">
      <GoogleInArticleAd />
    </div>
  </div>
) : (
  <div className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
    The full article content has not yet been
    added to this test record.
  </div>
)}

            {article.officialSourceUrl ? (
              <section className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold text-slate-950">
                  Official source
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Verify this information through the original
                  government, immigration, embassy, university,
                  or official organization announcement.
                </p>

                <a
                  href={article.officialSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Visit{" "}
                  {article.officialSourceName ||
                    "official source"}
                  <span className="ml-2" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </section>
            ) : null}

            {article.tags.length > 0 ? (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-slate-200 pt-8">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="space-y-8">
            {/*<div>
              <div className="text-center text-xs text-slate-400">
                Advertisement
              </div>

              <div className="mt-3 flex min-h-[280px] items-center justify-center bg-slate-50">
                <span className="text-sm text-slate-300">
                  Advertisement
                </span>
              </div>
            </div>*/}

            <section className="rounded-md border border-[#DCD4C2] bg-[#FDFBF7] p-5">
  <div className="-mx-5 -mt-5 mb-5 rounded-t-md bg-[#D8CBB3] px-5 py-3">
    <h2 className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A4235]">
      Article information
    </h2>
  </div>

  <dl className="space-y-5 text-sm">
    <div>
      <dt className="font-semibold text-slate-900">
        Country
      </dt>

      <dd className="mt-1 text-slate-600">
        {article.country}
      </dd>
    </div>

    {article.region ? (
      <div>
        <dt className="font-semibold text-slate-900">
          Region
        </dt>

        <dd className="mt-1 text-slate-600">
          {article.region}
        </dd>
      </div>
    ) : null}

    <div>
      <dt className="font-semibold text-slate-900">
        Category
      </dt>

      <dd className="mt-1 text-slate-600">
        {article.category}
      </dd>
    </div>

    <div>
      <dt className="font-semibold text-slate-900">
        Last updated
      </dt>

      <dd className="mt-1 text-slate-600">
        {formatDate(
          article.updatedAt ||
          article.publishedAt
        )}
      </dd>
    </div>
  </dl>
</section>
            <RelatedGuideLinks />
          </aside>
        </div>
     </article>

      {/* Pre-footer editorial section */}
      <section className="border-t-2 border-slate-800 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-14 md:grid-cols-3 lg:px-8 lg:py-16">
          {/* Browse news */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-slate-600">
              Browse News and Articles
            </h2>

            <nav
              className="mt-7 space-y-5"
              aria-label="News categories"
            >
              <Link
                to="/international-student-news"
                className="block text-base text-slate-900 hover:text-blue-700"
              >
                Visa &amp; Immigration
              </Link>

              <Link
                to="/international-student-news"
                className="block text-base text-slate-900 hover:text-blue-700"
              >
                University Admissions
              </Link>

              <Link
                to="/international-student-news"
                className="block text-base text-slate-900 hover:text-blue-700"
              >
                Scholarships &amp; Funding
              </Link>

              <Link
                to="/international-student-news"
                className="block text-base text-slate-900 hover:text-blue-700"
              >
                Work Rights
              </Link>

              <Link
                to="/international-student-news"
                className="block text-base text-slate-900 hover:text-blue-700"
              >
                Post-study Work
              </Link>
            </nav>
          </div>

          {/* Share article */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-slate-600">
              Share This Article
            </h2>

            <div className="mt-7 flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(window.location.href)
                    .catch(() => {});
                }}
                aria-label="Copy article link"
                title="Copy article link"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 text-xl text-slate-700 transition hover:border-blue-700 hover:text-blue-700"
              >
                🔗
              </button>

              <a
                href={`mailto:?subject=${encodeURIComponent(
                  article.title
                )}&body=${encodeURIComponent(
                  `Read this international student news article: ${window.location.href}`
                )}`}
                aria-label="Share article by email"
                title="Share article by email"
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
              Scholars
              <span className="text-orange-500">
                Knowledge
              </span>
            </Link>

            <p className="mx-auto mt-6 max-w-md text-base leading-8 text-slate-600">
              Helping international students discover verified
              news, scholarships, fellowships, funded graduate
              opportunities, and expert application guidance.
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
              © {new Date().getFullYear()} ScholarsKnowledge. All
              rights reserved.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}