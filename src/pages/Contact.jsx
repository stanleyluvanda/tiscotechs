// src/pages/Contact.jsx
import React, { useState } from "react";

const SUPPORT_API =
  (import.meta.env.VITE_SUPPORT_API_BASE &&
    String(import.meta.env.VITE_SUPPORT_API_BASE).trim()) ||
  "http://localhost:5001";

function Field({ label, children, required }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("General question");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState({ kind: "idle", note: "" });

  async function onSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({
        kind: "error",
        note: "Please complete Name, Email, and Message.",
      });
      return;
    }
    setStatus({ kind: "busy", note: "Sending…" });

    const payload = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      topic,
      message: message.trim(),
      createdAt: new Date().toISOString(),
      source: "ContactPage",
    };

    // Try backend first (if you later add /api/contact)
    try {
      /*const res = await fetch(`${API_BASE}/api/contact`, {*/
      const res = await fetch(`${SUPPORT_API}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("non-200");
      setStatus({ kind: "ok", note: "Thanks! Your message has been sent." });
      setName("");
      setEmail("");
      setTopic("General question");
      setMessage("");
      return;
    } catch {
      // Fallback to localStorage
      try {
        const arr = JSON.parse(localStorage.getItem("contactMessages") || "[]");
        arr.push(payload);
        localStorage.setItem("contactMessages", JSON.stringify(arr));
        setStatus({
          kind: "ok",
          note: "Thanks! Your message has been saved. We’ll reply via email.",
        });
        setName("");
        setEmail("");
        setTopic("General question");
        setMessage("");
        return;
      } catch {
        setStatus({
          kind: "error",
          note: "Couldn’t send right now. Please try again later.",
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <main className="max-w-[980px] mx-auto px-4 lg:px-8 py-10">
        {/* Hero */}
        <header className="rounded-2xl border border-slate-100 p-6 shadow-sm bg-[linear-gradient(180deg,#eef6ff_0%,#fdfbff_55%,#ffffff_100%)]">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Contact us</h1>
              <p className="mt-1 text-slate-700">
                Have a question about programs, applications, scholarships, or our
                platform? Send us a message and we’ll get back to you.
              </p>
            </div>

            <div className="text-xs text-slate-600">
              Typical response time: <span className="font-semibold">1–2 business days</span>
            </div>
          </div>
        </header>

        {/* Single-column layout */}
        <section className="mt-6 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <form onSubmit={onSubmit} className="grid gap-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Full name" required>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </Field>

              <Field label="Email" required>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </Field>
            </div>

            <Field label="Topic">
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option>General question</option>
                <option>Studying in the U.S.</option>
                <option>Scholarships</option>
                <option>Account / Login</option>
                <option>Partnerships</option>
                <option>Other</option>
              </select>
            </Field>

            <Field label="Message" required>
              <textarea
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                rows={7}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
              />
            </Field>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-slate-500">
                Please include your registered email for account issues.
              </div>

              <button
                type="submit"
                disabled={status.kind === "busy"}
                className="sm:self-end rounded-full bg-blue-600 px-5 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {status.kind === "busy" ? "Sending…" : "Send message"}
              </button>
            </div>

            {status.kind === "ok" && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {status.note}
              </div>
            )}
            {status.kind === "error" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {status.note}
              </div>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}