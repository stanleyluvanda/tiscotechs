// src/pages/InternationalStudentNewsForm.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import {
  createInternationalStudentNews,
} from "../utils/internationalStudentNewsApi";

const NEWS_API_BASE = (
  import.meta.env.VITE_NEWS_API_BASE ||
  "https://n6lrtg000m.execute-api.us-east-1.amazonaws.com/default"
).replace(/\/+$/, "");

const COUNTRY_OPTIONS = [
  "Global",
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Ireland",
  "New Zealand",
];

const CATEGORY_OPTIONS = [
  "Visa & Immigration",
  "University Admissions",
  "Scholarships & Funding",
  "Work Rights",
  "Post-study Work",
  "Tuition & Costs",
  "Student Safety",
  "Education Policy",
  "International Education",
  "Scholarship",
  "Fellowship",
  "Grants",
  "Internship opportunities"
];

const IMPORTANCE_OPTIONS = [
  "Information",
  "Important",
  "Urgent",
];

const INITIAL_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  country: "Global",
  region: "",
  category: "International Education",
  importance: "Information",
  imageUrl: "",
  imageAlt: "",
  publishedBy: "ScholarsKnowledge",
  sourceName: "",
  sourceUrl: "",
  youtubeUrl: "",
  tags: "",
  status: "draft",
};

const quillModules = {
  toolbar: [
    [{ header: [2, 3, 4, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["blockquote", "link"],
    ["clean"],
  ],
};

function isCloudFrontUrl(value = "") {
  return /^https:\/\/[^/]+\.cloudfront\.net\//i.test(
    String(value || "").trim()
  );
}

function pickCloudFrontUrl(response) {
  if (!response || typeof response !== "object") return "";

  return (
    response.cloudfrontUrl ||
    response.cloudFrontUrl ||
    response.publicUrl ||
    response.cdnUrl ||
    response.url ||
    ""
  );
}

async function getNewsImageUploadUrl({ fileName, contentType }) {
  if (!NEWS_API_BASE) {
    throw new Error("Missing VITE_NEWS_API_BASE.");
  }

  const response = await fetch(
    `${NEWS_API_BASE}/api/news/upload-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName,
        contentType,
      }),
    }
  );

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Image upload URL request failed with HTTP ${response.status}.`
    );
  }

  const uploadUrl = data?.uploadUrl;
  const publicUrl = pickCloudFrontUrl(data);

  if (!uploadUrl || !publicUrl) {
    throw new Error(
      "The News API did not return an upload URL and CloudFront URL."
    );
  }

  return {
    uploadUrl,
    publicUrl,
  };
}

async function uploadFileToS3(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(
      `Image upload failed with HTTP ${response.status}.`
    );
  }
}

async function importHostedNewsImage(imageUrl) {
  if (!NEWS_API_BASE) {
    throw new Error("Missing VITE_NEWS_API_BASE.");
  }

  const response = await fetch(
    `${NEWS_API_BASE}/api/news/import-image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: imageUrl,
      }),
    }
  );

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Hosted image import failed with HTTP ${response.status}.`
    );
  }

  const publicUrl = pickCloudFrontUrl(data);

  if (!publicUrl) {
    throw new Error(
      "The News API did not return a CloudFront URL."
    );
  }

  return publicUrl;
}

async function optimizeNewsImage(
  file,
  {
    maxWidth = 1600,
    maxHeight = 1000,
    quality = 0.7,
  } = {}
) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Select a valid image file.");
  }

  // Preserve SVG files as-is.
  if (file.type === "image/svg+xml") {
    return file;
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(new Error("The selected image could not be read."));

    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const element = new Image();

    element.onload = () => resolve(element);
    element.onerror = () =>
      reject(new Error("The selected image could not be processed."));

    element.src = dataUrl;
  });

  const width = image.width || 0;
  const height = image.height || 0;

  if (!width || !height) return file;

  const scale = Math.min(
    maxWidth / width,
    maxHeight / height,
    1
  );

  const targetWidth = Math.max(
    1,
    Math.round(width * scale)
  );

  const targetHeight = Math.max(
    1,
    Math.round(height * scale)
  );

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d", {
    alpha: true,
  });

  if (!context) return file;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,
    0,
    0,
    targetWidth,
    targetHeight
  );

  const blob = await new Promise((resolve) => {
    canvas.toBlob(
      (result) => resolve(result),
      "image/webp",
      quality
    );
  });

  if (!blob) return file;

  const baseName = String(file.name || "news-image")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "_");

  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function createSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(value) {
  if (!value) return "";

  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function InternationalStudentNewsForm() {
  const navigate = useNavigate();

  const contentEditorHostRef = useRef(null);
  const contentQuillRef = useRef(null);
  const imageInputRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [slugWasEdited, setSlugWasEdited] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importingImage, setImportingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const host = contentEditorHostRef.current;

    if (!host) return undefined;

    let quill = host.__quill;

    if (!quill) {
      quill = new Quill(host, {
        theme: "snow",
        placeholder:
          "Write the complete international student news article...",
        modules: quillModules,
      });

      host.__quill = quill;
    }

    contentQuillRef.current = quill;

    const handleTextChange = () => {
      const html = quill.root.innerHTML;

      setForm((current) => ({
        ...current,
        content: html,
      }));

      setError("");
      setSuccess("");
    };

    quill.on("text-change", handleTextChange);

    // Synchronize any content already present in the editor.
    handleTextChange();

    return () => {
      quill.off("text-change", handleTextChange);

      if (contentQuillRef.current === quill) {
        contentQuillRef.current = null;
      }
    };
  }, []);

  function getCurrentArticleContent() {
    const quill = contentQuillRef.current;

    if (quill?.root) {
      return quill.root.innerHTML || "";
    }

    return form.content || "";
  }

  const currentArticleContent = getCurrentArticleContent();
  const contentText = stripHtml(currentArticleContent);

  const contentWordCount = contentText
    ? contentText.split(/\s+/).filter(Boolean).length
    : 0;

  function insertYouTubePlaceholder() {
    const quill = contentQuillRef.current;

    if (!quill) return;

    const range = quill.getSelection(true);
    const insertIndex = range?.index ?? Math.max(0, quill.getLength() - 1);
    const placeholder = "[[YOUTUBE]]";

    quill.insertText(insertIndex, placeholder, "user");
    quill.insertText(insertIndex + placeholder.length, "\n", "user");
    quill.setSelection(
      insertIndex + placeholder.length + 1,
      0,
      "silent"
    );
    quill.focus();
  }

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handleTitleChange(event) {
    const title = event.target.value;

    setForm((current) => ({
      ...current,
      title,
      slug: slugWasEdited
        ? current.slug
        : createSlug(title),
    }));

    setError("");
    setSuccess("");
  }

  function handleSlugChange(event) {
    setSlugWasEdited(true);

    setForm((current) => ({
      ...current,
      slug: createSlug(event.target.value),
    }));

    setError("");
    setSuccess("");
  }

  async function handleImageFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Select a valid PNG, JPG, WebP, or SVG image.");
      event.target.value = "";
      return;
    }

    const maximumFileSize = 10 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      setError("The selected image must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    setError("");
    setSuccess("");

    try {
      const optimizedFile = await optimizeNewsImage(file, {
        maxWidth: 1600,
        maxHeight: 1000,
        quality: 0.7,
      });

      const safeName = String(
        optimizedFile.name || "news-image.webp"
      ).replace(/[^\w.-]+/g, "_");

      const { uploadUrl, publicUrl } =
        await getNewsImageUploadUrl({
          fileName: safeName,
          contentType:
            optimizedFile.type || "image/webp",
        });

      await uploadFileToS3(uploadUrl, optimizedFile);

      if (!isCloudFrontUrl(publicUrl)) {
        throw new Error(
          "The upload succeeded, but the API did not return a CloudFront URL."
        );
      }

      setForm((current) => ({
        ...current,
        imageUrl: publicUrl,
      }));

      setImagePreview(publicUrl);
    } catch (uploadError) {
      setError(
        uploadError?.message ||
          "The featured image could not be uploaded."
      );
    } finally {
      setUploadingImage(false);

      if (event.target) {
        event.target.value = "";
      }
    }
  }

  async function handleManualImageUrlChange(event) {
    const value = event.target.value;
    const trimmedValue = value.trim();

    setForm((current) => ({
      ...current,
      imageUrl: value,
    }));

    setImagePreview(trimmedValue);
    setError("");
    setSuccess("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    if (!trimmedValue) {
      return;
    }

    if (isCloudFrontUrl(trimmedValue)) {
      return;
    }

    if (!/^https?:\/\//i.test(trimmedValue)) {
      return;
    }

    setImportingImage(true);

    try {
      const cloudfrontUrl =
        await importHostedNewsImage(trimmedValue);

      if (!isCloudFrontUrl(cloudfrontUrl)) {
        throw new Error(
          "The imported image did not return a valid CloudFront URL."
        );
      }

      setForm((current) => ({
        ...current,
        imageUrl: cloudfrontUrl,
      }));

      setImagePreview(cloudfrontUrl);
      setSuccess(
        "The hosted image was imported successfully."
      );
    } catch (importError) {
      setImagePreview("");
      setError(
        importError?.message ||
          "The hosted image could not be imported."
      );
    } finally {
      setImportingImage(false);
    }
  }

  function clearFeaturedImage() {
    setForm((current) => ({
      ...current,
      imageUrl: "",
      imageAlt: "",
    }));

    setImagePreview("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    setError("");
    setSuccess("");
  }

  function validateForm() {
    if (uploadingImage || importingImage) {
      return "Wait for the featured image processing to finish.";
    }

    if (!form.title.trim()) {
      return "Enter the article title.";
    }

    if (!form.slug.trim()) {
      return "Enter the article slug.";
    }

    if (!form.excerpt.trim()) {
      return "Enter a short article excerpt.";
    }

    const articleContent = getCurrentArticleContent();
    const articleContentText = stripHtml(articleContent);

    if (!articleContentText) {
      return "Enter the article content.";
    }

    if (!form.country) {
      return "Select a country.";
    }

    if (!form.category) {
      return "Select a category.";
    }

    if (!form.publishedBy.trim()) {
      return "Enter the publisher name.";
    }

    if (
      form.sourceUrl &&
      !/^https?:\/\//i.test(form.sourceUrl.trim())
    ) {
      return "The source URL must begin with http:// or https://.";
    }

    if (
      form.youtubeUrl &&
      !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(
        form.youtubeUrl.trim()
      )
    ) {
      return "Enter a valid YouTube video URL.";
    }

    if (
      form.imageUrl &&
      !isCloudFrontUrl(form.imageUrl)
    ) {
      return "The featured image must be uploaded to CloudFront.";
    }

    return "";
  }

  function buildPayload() {
    const articleContent = getCurrentArticleContent();

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    return {
      // NewsHandler accepts title as a compatibility alias for headline.
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),

      // Match the NewsHandler article-body schema.
      articleHtml: articleContent,
      articleContent,

      country: form.country,
      region: form.region.trim(),
      category: form.category,
      importance: form.importance,

      // Store only the CloudFront URL in DynamoDB.
      imageUrl: form.imageUrl.trim(),
      imageAlt: form.imageAlt.trim(),

      publishedBy: form.publishedBy.trim(),

      // Match the NewsHandler source-field schema.
      officialSourceName: form.sourceName.trim(),
      officialSourceUrl: form.sourceUrl.trim(),
      youtubeUrl: form.youtubeUrl.trim(),

      tags,
      status: form.status,
    };
  }

  async function submitArticle(payload) {
    return createInternationalStudentNews(payload);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || uploadingImage || importingImage) return;

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = buildPayload();
      const response = await submitArticle(payload);

      if (response?.ok === false) {
        throw new Error(
          response?.message ||
            "The international student news article could not be saved."
        );
      }

      setSuccess(
        form.status === "pending"
          ? "The article was submitted for review."
          : "The article was saved as a draft."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (requestError) {
      setError(
        requestError?.message ||
          "The international student news article could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    const confirmed = window.confirm(
      "Clear all fields in this news article form?"
    );

    if (!confirmed) return;

    setForm(INITIAL_FORM);
    setSlugWasEdited(false);
    setImagePreview("");
    setError("");
    setSuccess("");

    if (contentQuillRef.current) {
      contentQuillRef.current.setContents([]);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/partner/welcome"
            className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            <span className="mr-2" aria-hidden="true">
              ←
            </span>
            Back to Partner Welcome
          </Link>

          <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-purple-700">
                ScholarsKnowledge Partner
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Submit International Student News
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Submit an international student news article for
                review. Enter the complete article body through one
                content editor.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/partner/welcome")}
              className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            role="status"
            className="mb-6 rounded-lg border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700"
          >
            {success}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-7">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="border-b border-slate-200 pb-5">
                <h2 className="text-xl font-bold text-slate-950">
                  Article information
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Enter the headline, URL slug, and summary shown
                  on the public news listing.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Article title
                    <span className="ml-1 text-red-600">*</span>
                  </span>

                  <input
                    type="text"
                    value={form.title}
                    onChange={handleTitleChange}
                    placeholder="Enter the international student news headline"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Article slug
                    <span className="ml-1 text-red-600">*</span>
                  </span>

                  <div className="flex rounded-lg border border-slate-300 bg-white focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100">
                    <span className="hidden items-center border-r border-slate-200 bg-slate-50 px-4 text-sm text-slate-500 sm:flex">
                      /international-student-news/
                    </span>

                    <input
                      type="text"
                      value={form.slug}
                      onChange={handleSlugChange}
                      placeholder="article-url-slug"
                      className="min-w-0 flex-1 rounded-lg bg-transparent px-4 py-3 text-slate-950 outline-none sm:rounded-l-none"
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    The slug is generated from the title but may
                    be edited.
                  </p>
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold text-slate-800">
                    <span>
                      Short excerpt
                      <span className="ml-1 text-red-600">*</span>
                    </span>

                    <span className="font-normal text-slate-500">
                      {form.excerpt.length}/320
                    </span>
                  </span>

                  <textarea
                    value={form.excerpt}
                    onChange={(event) =>
                      updateField(
                        "excerpt",
                        event.target.value.slice(0, 320)
                      )
                    }
                    rows={4}
                    placeholder="Write a concise summary for the news listing and search results."
                    className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="border-b border-slate-200 pb-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">
                      Article content
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Write the complete article in the single
                      editor below.
                    </p>
                  </div>

                  <p className="text-xs text-slate-500">
                    {contentWordCount}{" "}
                    {contentWordCount === 1
                      ? "word"
                      : "words"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={insertYouTubePlaceholder}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Insert YouTube Video
                </button>
              </div>

              <div className="news-content-editor mt-4 w-full">
                <div
                  ref={contentEditorHostRef}
                  className="min-h-[420px] w-full bg-white"
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Use headings, paragraphs, lists, quotations, and
                links within this editor. If you added a YouTube
                URL, place the cursor where you want the video to
                appear and click "Insert YouTube Video."
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="border-b border-slate-200 pb-5">
                <h2 className="text-xl font-bold text-slate-950">
                  Source information
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Record the original organization and source page
                  when the article is based on an external
                  announcement.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Source name
                  </span>

                  <input
                    type="text"
                    value={form.sourceName}
                    onChange={(event) =>
                      updateField(
                        "sourceName",
                        event.target.value
                      )
                    }
                    placeholder="Government department, university, or organization"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Source URL
                  </span>

                  <input
                    type="url"
                    value={form.sourceUrl}
                    onChange={(event) =>
                      updateField(
                        "sourceUrl",
                        event.target.value
                      )
                    }
                    placeholder="https://example.com/news"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </label>
              </div>
            </section>


            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="border-b border-slate-200 pb-5">
                <h2 className="text-xl font-bold text-slate-950">
                  Related YouTube Video
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Optionally add an official YouTube video related
                  to this article, such as a government
                  announcement, university update, interview, or
                  explanatory video.
                </p>
              </div>

              <div className="mt-6">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    YouTube Video URL
                  </span>

                  <input
                    type="url"
                    value={form.youtubeUrl}
                    onChange={(event) =>
                      updateField(
                        "youtubeUrl",
                        event.target.value
                      )
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Leave blank if there is no related video. The
                    video remains hosted by YouTube and will be
                    embedded on the news detail page.
                  </p>
                </label>
              </div>
            </section>


          </div>

          <aside className="space-y-7">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Submission
              </h2>

              <div className="mt-5 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Status
                  </span>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField(
                        "status",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="draft">
                      Save as draft
                    </option>
                    <option value="pending">
                      Submit for review
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Published by
                    <span className="ml-1 text-red-600">*</span>
                  </span>

                  <input
                    type="text"
                    value={form.publishedBy}
                    onChange={(event) =>
                      updateField(
                        "publishedBy",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Classification
              </h2>

              <div className="mt-5 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Country
                    <span className="ml-1 text-red-600">*</span>
                  </span>

                  <select
                    value={form.country}
                    onChange={(event) =>
                      updateField(
                        "country",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  >
                    {COUNTRY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Region
                  </span>

                  <input
                    type="text"
                    value={form.region}
                    onChange={(event) =>
                      updateField(
                        "region",
                        event.target.value
                      )
                    }
                    placeholder="North America, Europe, Global..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Category
                    <span className="ml-1 text-red-600">*</span>
                  </span>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateField(
                        "category",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Importance
                  </span>

                  <select
                    value={form.importance}
                    onChange={(event) =>
                      updateField(
                        "importance",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  >
                    {IMPORTANCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Tags
                  </span>

                  <input
                    type="text"
                    value={form.tags}
                    onChange={(event) =>
                      updateField(
                        "tags",
                        event.target.value
                      )
                    }
                    placeholder="visa, admissions, international students"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Separate tags with commas.
                  </p>
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Featured image
              </h2>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Upload an image from your computer or paste a hosted
                image URL. Hosted images are copied into
                ScholarsKnowledge storage and served through
                CloudFront.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Upload from computer
                  </span>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage || importingImage}
                    className="block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-purple-50 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-purple-700 hover:file:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    PNG, JPG, WebP, or SVG. Maximum original size:
                    10 MB.
                  </p>

                  {uploadingImage ? (
                    <p className="mt-2 text-xs font-medium text-purple-700">
                      Optimizing and uploading image...
                    </p>
                  ) : importingImage ? (
                    <p className="mt-2 text-xs font-medium text-purple-700">
                      Importing hosted image to CloudFront...
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Or
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Hosted image URL
                  </span>

                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={handleManualImageUrlChange}
                    disabled={uploadingImage || importingImage}
                    placeholder="https://example.com/news-image.jpg"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Paste a direct HTTP or HTTPS image URL. The image
                    will be copied into ScholarsKnowledge storage and
                    replaced with its CloudFront URL.
                  </p>

                  {importingImage ? (
                    <p className="mt-2 text-xs font-medium text-purple-700">
                      Downloading and importing hosted image...
                    </p>
                  ) : null}

                  {form.imageUrl &&
                  isCloudFrontUrl(form.imageUrl) ? (
                    <p className="mt-2 text-xs font-medium text-green-700">
                      CloudFront URL confirmed
                    </p>
                  ) : null}

                  {form.imageUrl &&
                  !isCloudFrontUrl(form.imageUrl) &&
                  !importingImage ? (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      This image has not yet been imported to
                      CloudFront.
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Image alternative text
                  </span>

                  <input
                    type="text"
                    value={form.imageAlt}
                    onChange={(event) =>
                      updateField(
                        "imageAlt",
                        event.target.value
                      )
                    }
                    placeholder="Describe the image for accessibility"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </label>

                {imagePreview || form.imageUrl ? (
                  <div>
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      <img
                        src={imagePreview || form.imageUrl}
                        alt={
                          form.imageAlt ||
                          "Featured image preview"
                        }
                        className="aspect-[16/10] w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={clearFeaturedImage}
                      disabled={
                        uploadingImage || importingImage
                      }
                      className="mt-3 text-sm font-semibold text-red-700 hover:text-red-900 disabled:opacity-50"
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm text-slate-400">
                    Featured image preview
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={
                    saving || uploadingImage || importingImage
                  }
                  className="w-full rounded-lg bg-purple-700 px-5 py-3 text-sm font-bold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : uploadingImage
                      ? "Uploading image..."
                      : importingImage
                        ? "Importing image..."
                        : form.status === "pending"
                          ? "Submit article"
                          : "Save draft"}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={
                    saving || uploadingImage || importingImage
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Clear form
                </button>
              </div>
            </section>
          </aside>
        </div>
      </form>

      <style>{`
        .news-content-editor {
          display: block;
          width: 100%;
        }

        .news-content-editor .ql-toolbar {
          display: block;
          width: 100%;
          border-color: rgb(203 213 225);
          border-radius: 0.5rem 0.5rem 0 0;
          background: rgb(248 250 252);
        }

        .news-content-editor .ql-container {
          display: block;
          width: 100%;
          height: auto;
          min-height: 420px;
          border-color: rgb(203 213 225);
          border-radius: 0 0 0.5rem 0.5rem;
          background: white;
          font-family: inherit;
          font-size: 1rem;
        }

        .news-content-editor .ql-editor {
          width: 100%;
          min-height: 420px;
          padding: 1.25rem;
          line-height: 1.75;
          color: rgb(30 41 59);
        }

        .news-content-editor .ql-editor.ql-blank::before {
          left: 1.25rem;
          right: 1.25rem;
          color: rgb(148 163 184);
          font-style: normal;
        }
      `}</style>
    </main>
  );
}