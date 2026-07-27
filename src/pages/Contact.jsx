// src/pages/Contact.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  GraduationCap,
  Handshake,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

const SUPPORT_API =
  (import.meta.env.VITE_SUPPORT_API_BASE &&
    String(import.meta.env.VITE_SUPPORT_API_BASE).trim()) ||
  "http://localhost:5001";

const TOPIC_OPTIONS = [
  "General question",
  "Scholarships and funding",
  "Studying in the U.S.",
  "International student news",
  "Account or login issue",
  "Partner or university inquiry",
  "Technical support",
  "Report content",
  "Other",
];

const COUNTRY_OPTIONS = [
  "Not specified",
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Ireland",
  "New Zealand",
  "South Africa",
  "Nigeria",
  "Ghana",
  "Kenya",
  "Tanzania",
  "Uganda",
  "India",
  "Pakistan",
  "Bangladesh",
  "China",
  "Other",
];

const CONTACT_METHODS = [
  {
    title: "Email support",
    value: "support@scholarsknowledge.com",
    description:
      "For account, scholarship, academic-resource, and platform questions.",
    href: "mailto:support@scholarsknowledge.com",
    icon: Mail,
  },
  {
    title: "Partner inquiries",
    value: "partnerships@scholarsknowledge.com",
    description:
      "For universities, education organizations, sponsors, and institutions.",
    href: "mailto:partnerships@scholarsknowledge.com",
    icon: Handshake,
  },
  {
    title: "Response time",
    value: "1–2 business days",
    description:
      "Support requests are reviewed during regular business days.",
    icon: Clock3,
  },
  {
    title: "Global support",
    value: "Students worldwide",
    description:
      "ScholarsKnowledge supports students across countries and regions.",
    icon: Globe2,
  },
];

const SUPPORT_AREAS = [
  {
    title: "Student support",
    description:
      "Get help with your student account, academic materials, platform features, and general questions.",
    email: "support@scholarsknowledge.com",
    href: "mailto:support@scholarsknowledge.com?subject=Student%20Support",
    icon: GraduationCap,
  },
  {
    title: "Scholarships and funding",
    description:
      "Report an opportunity, request clarification, or ask about scholarship and funding content.",
    email: "scholarships@scholarsknowledge.com",
    href: "mailto:scholarships@scholarsknowledge.com?subject=Scholarships%20and%20Funding",
    icon: BookOpen,
  },
  {
    title: "University partnerships",
    description:
      "Connect with ScholarsKnowledge about publishing opportunities, sponsorships, and institutional partnerships.",
    email: "scholarships@scholarsknowledge.com",
    href: "mailto:scholarships@scholarsknowledge.com?subject=University%20Partnership",
    icon: Handshake,
  },
  {
    title: "News and content",
    description:
      "Submit a correction, report outdated information, or contact us about international student news.",
    email: "info@scholarsknowledge.com",
    href: "mailto:info@scholarsknowledge.com?subject=News%20and%20Content",
    icon: Newspaper,
  },
];

const FAQ_ITEMS = [
  {
    question: "How long does it take to receive a response?",
    answer:
      "Most messages receive a response within one to two business days. Complex account, partnership, or content-review requests may take longer.",
  },
  {
    question: "Can I ask about a specific scholarship?",
    answer:
      "Yes. Include the scholarship title, provider, country, and page link so the support team can review the correct opportunity.",
  },
  {
    question: "How can a university or organization become a partner?",
    answer:
      "Select the partner or university inquiry topic and explain your organization, the opportunities you want to publish, and the type of partnership you are seeking.",
  },
  {
    question: "What should I include when reporting a technical issue?",
    answer:
      "Include the page you were using, what you expected to happen, what actually happened, your browser or device, and any visible error message.",
  },
];

function Field({ label, children, required, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>

      {hint && (
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {hint}
        </span>
      )}

      <div className="mt-2">{children}</div>
    </label>
  );
}

function ContactMethodCard({ item }) {
  const Icon = item.icon;

  const card = (
    <div className="group h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={21} strokeWidth={2} />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>

          <div className="mt-1 break-words text-sm font-semibold text-blue-700">
            {item.value}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );

  if (!item.href) return card;

  return (
    <a href={item.href} className="block h-full">
      {card}
    </a>
  );
}

function SupportAreaCard({ item }) {
  const Icon = item.icon;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/15">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-800 shadow-sm">
        <Icon size={23} />
      </div>

      <h3 className="mt-5 text-xl font-bold text-white">{item.title}</h3>

      <p className="mt-3 flex-1 text-sm leading-7 text-blue-100">
        {item.description}
      </p>

    <a
  href={item.href}
  className="mt-6 block break-words text-sm font-bold leading-6 text-white hover:text-cyan-200"
>
  {item.email}
</a>
    </article>
  );
}

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    country: "Not specified",
    topic: "General question",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState({
    kind: "idle",
    note: "",
  });

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (status.kind === "error") {
      setStatus({
        kind: "idle",
        note: "",
      });
    }
  }

  function resetForm() {
    setForm({
      name: "",
      email: "",
      country: "Not specified",
      topic: "General question",
      subject: "",
      message: "",
    });
  }

  async function onSubmit(event) {
    event.preventDefault();

    setStatus({
      kind: "idle",
      note: "",
    });

    const cleanName = form.name.trim();
    const cleanEmail = form.email.trim();
    const cleanSubject = form.subject.trim();
    const cleanMessage = form.message.trim();

    if (!cleanName || !cleanEmail || !cleanSubject || !cleanMessage) {
      setStatus({
        kind: "error",
        note: "Please complete your name, email address, subject, and message.",
      });
      return;
    }

    setStatus({
      kind: "busy",
      note: "Sending your message…",
    });

    const payload = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      country: form.country,
      topic: form.topic,
      subject: cleanSubject,
      message: cleanMessage,
      createdAt: new Date().toISOString(),
      source: "ContactPage",
    };

    try {
      const response = await fetch(`${SUPPORT_API}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");

        throw new Error(
          responseText ||
            `Contact request failed with HTTP ${response.status}.`
        );
      }

      setStatus({
        kind: "ok",
        note: "Your message has been sent. The ScholarsKnowledge team will reply by email.",
      });

      resetForm();
      return;
    } catch (apiError) {
      console.warn(
        "Contact API request failed. Saving the message locally as a fallback.",
        apiError
      );

      try {
        const savedMessages = JSON.parse(
          localStorage.getItem("contactMessages") || "[]"
        );

        const messages = Array.isArray(savedMessages) ? savedMessages : [];

        messages.push(payload);

        localStorage.setItem("contactMessages", JSON.stringify(messages));

        setStatus({
          kind: "ok",
          note: "Your message has been saved. The support team will reply using the email address provided.",
        });

        resetForm();
      } catch (storageError) {
        console.error("Could not save contact message.", storageError);

        setStatus({
          kind: "error",
          note: "Your message could not be sent right now. Please try again later.",
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main>
        {/* Hero */}
        <section
          className="relative overflow-hidden bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/contact.webp')",
          }}
        >
          <div className="absolute inset-0 bg-black/30" />

<div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                <MessageCircle size={17} />
                ScholarsKnowledge Support
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Contact ScholarsKnowledge
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-100 sm:text-lg">
                Contact us about scholarships, student accounts, academic
                resources, partnerships, international student news, or
                technical support.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-cyan-300" />
                  Worldwide student support
                </div>

                <div className="flex items-center gap-2">
                  <Clock3 size={18} className="text-cyan-300" />
                  Typical response in 1–2 business days
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-cyan-300" />
                  Secure support requests
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main contact area */}
        <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
            <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
              {/* Left information panel */}
              <aside className="relative overflow-hidden bg-gradient-to-br from-[#083b7a] via-[#0a4f9d] to-[#0873c4] p-7 text-white sm:p-10 lg:p-12">
                <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10" />
                <div className="absolute -right-8 -top-12 h-52 w-52 rounded-full border border-white/10" />
                <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/5" />

                <div className="relative">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">
                    Get in touch
                  </p>

                  <h2 className="mt-4 text-3xl font-extrabold leading-tight">
                    Tell us how we can help.
                  </h2>

                  <p className="mt-5 max-w-md text-sm leading-7 text-blue-50">
                    Provide enough detail for the support team to understand your
                    request. For account issues, include the email address
                    associated with your ScholarsKnowledge account.
                  </p>

                  <div className="mt-8 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <Mail size={19} />
                      </div>

                      <div>
                        <div className="text-sm font-bold">Email support</div>

                        <a
                          href="mailto:support@scholarsknowledge.com"
                          className="mt-1 block break-all text-sm text-blue-50 hover:text-white hover:underline"
                        >
                          support@scholarsknowledge.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <Globe2 size={19} />
                      </div>

                      <div>
                        <div className="text-sm font-bold">Website</div>

                        <a
                          href="https://scholarsknowledge.com"
                          className="mt-1 block text-sm text-blue-50 hover:text-white hover:underline"
                        >
                          scholarsknowledge.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <Clock3 size={19} />
                      </div>

                      <div>
                        <div className="text-sm font-bold">
                          Support availability
                        </div>

                        <p className="mt-1 text-sm leading-6 text-blue-50">
                          Monday through Friday
                          <br />
                          Responses generally arrive within 1–2 business days.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <Users size={19} />
                      </div>

                      <div>
                        <div className="text-sm font-bold">Who we support</div>

                        <p className="mt-1 text-sm leading-6 text-blue-50">
                          Students, lecturers, universities, education
                          organizations, and institutional partners.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={21} className="text-cyan-200" />
                      <h3 className="font-bold">Before sending</h3>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-blue-50">
                      Do not include passwords, verification codes, payment card
                      numbers, immigration document numbers, or other highly
                      sensitive personal information.
                    </p>
                  </div>
                </div>
              </aside>

              {/* Contact form */}
              <div className="p-6 sm:p-10 lg:p-12">
                <div className="max-w-3xl">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
                    Send a message
                  </p>

                  <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
                    How can ScholarsKnowledge assist you?
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Complete the form below. Required fields are marked with an
                    asterisk.
                  </p>

                  <form onSubmit={onSubmit} className="mt-8 space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Full name" required>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={updateField}
                          autoComplete="name"
                          placeholder="Enter your full name"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </Field>

                      <Field label="Email address" required>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={updateField}
                          autoComplete="email"
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </Field>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Country or region">
                        <select
                          name="country"
                          value={form.country}
                          onChange={updateField}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        >
                          {COUNTRY_OPTIONS.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Topic">
                        <select
                          name="topic"
                          value={form.topic}
                          onChange={updateField}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        >
                          {TOPIC_OPTIONS.map((topic) => (
                            <option key={topic} value={topic}>
                              {topic}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Field label="Subject" required>
                      <input
                        type="text"
                        name="subject"
                        value={form.subject}
                        onChange={updateField}
                        placeholder="Briefly describe your request"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </Field>

                    <Field
                      label="Message"
                      required
                      hint="Include relevant page names, links, scholarship titles, or error messages."
                    >
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={updateField}
                        rows={8}
                        placeholder="Write your message here..."
                        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </Field>

                    <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-md text-xs leading-5 text-slate-500">
                        By submitting this form, you agree that
                        ScholarsKnowledge may use the information provided to
                        respond to your inquiry.
                      </p>

                     <button
  type="submit"
  disabled={status.kind === "busy"}
  className="inline-flex items-center justify-center rounded-full bg-[#F47C2C] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E46E20] focus:outline-none focus:ring-4 focus:ring-[#F9B27E] disabled:cursor-not-allowed disabled:opacity-60"
>
  {status.kind === "busy" ? (
    <>
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      Sending
    </>
  ) : (
    "Send"
  )}
</button>
                    </div>

                    {status.kind === "ok" && (
                      <div
                        role="status"
                        className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                      >
                        <CheckCircle2
                          size={20}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />

                        <span>{status.note}</span>
                      </div>
                    )}

                    {status.kind === "error" && (
                      <div
                        role="alert"
                        className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
                      >
                        {status.note}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact methods */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Contact information
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
              Other ways to reach ScholarsKnowledge
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Use the appropriate contact route so your request reaches the
              right team.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CONTACT_METHODS.map((item) => (
              <ContactMethodCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
                Frequently asked questions
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
                Before contacting support
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                These answers may help you prepare the information needed for a
                faster response.
              </p>
            </div>

            <div className="mt-9 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="group p-5 open:bg-slate-50 sm:p-6"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-bold text-slate-900">
                    <span>{item.question}</span>

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition group-open:rotate-90">
                      <ArrowRight size={17} />
                    </span>
                  </summary>

                  <p className="mt-4 max-w-3xl pr-8 text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Support areas above footer */}
        <section className="relative overflow-hidden bg-[#07366f]">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-300 blur-3xl" />
            <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-blue-300 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">
                  Dedicated support
                </p>

                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Find the right team for your request.
                </h2>

                <p className="mt-5 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
                  ScholarsKnowledge serves students, lecturers, universities,
                  and education organizations. Select the area that best matches
                  your question.
                </p>
              </div>

              <div className="flex lg:justify-end">
                <a
                  href="mailto:support@scholarsknowledge.com"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-800 shadow-sm transition hover:bg-blue-50"
                >
                  Email the support team
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {SUPPORT_AREAS.map((item) => (
                <SupportAreaCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#031f42] text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-3 text-white"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
                  <GraduationCap size={24} />
                </div>

                <div>
                  <div className="text-lg font-extrabold">
                    ScholarsKnowledge
                  </div>

                  <div className="text-xs text-blue-200">
                    Learning. Sharing. Opportunities.
                  </div>
                </div>
              </Link>

              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
                A global academic platform where students and lecturers share
                learning materials, discover opportunities, and connect with
                education partners.
              </p>

              <div className="mt-6 space-y-3 text-sm">
                <a
                  href="mailto:support@scholarsknowledge.com"
                  className="flex items-center gap-3 hover:text-white"
                >
                  <Mail size={17} className="text-blue-300" />
                  support@scholarsknowledge.com
                </a>

                <div className="flex items-center gap-3">
                  <Globe2 size={17} className="text-blue-300" />
                  Supporting students worldwide
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
                Opportunities
              </h3>

              <nav className="mt-5 space-y-3 text-sm">
                <Link
                  to="/scholarships"
                  className="block transition hover:text-white"
                >
                  Scholarships
                </Link>

                <Link
                  to="/fellowships"
                  className="block transition hover:text-white"
                >
                  Fellowships
                </Link>

                <Link
                  to="/funded-graduate-admission"
                  className="block transition hover:text-white"
                >
                  Funded graduate admission
                </Link>

                <Link
                  to="/international-student-news"
                  className="block transition hover:text-white"
                >
                  International student news
                </Link>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
                Community
              </h3>

              <nav className="mt-5 space-y-3 text-sm">
                <Link
                  to="/student-sign-up"
                  className="block transition hover:text-white"
                >
                  Student sign up
                </Link>

                <Link
                  to="/lecturer-sign-up"
                  className="block transition hover:text-white"
                >
                  Lecturer sign up
                </Link>

                <Link
                  to="/partner"
                  className="block transition hover:text-white"
                >
                  Partner with us
                </Link>

                <Link
                  to="/contact"
                  className="block transition hover:text-white"
                >
                  Contact support
                </Link>
              </nav>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
                Information
              </h3>

              <nav className="mt-5 space-y-3 text-sm">
                <Link
                  to="/about"
                  className="block transition hover:text-white"
                >
                  About ScholarsKnowledge
                </Link>

                <Link
                  to="/privacy-policy"
                  className="block transition hover:text-white"
                >
                  Privacy policy
                </Link>

                <Link
                  to="/terms-of-use"
                  className="block transition hover:text-white"
                >
                  Terms of use
                </Link>

                <a
                  href="https://scholarsknowledge.com"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  ScholarsKnowledge.com
                  <ExternalLink size={14} />
                </a>
              </nav>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} ScholarsKnowledge. All rights
              reserved.
            </p>

            <p>
              Scholarship and opportunity information should always be verified
              with the official provider.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}