//ScholarshipTipsWinningSOP//
import { useEffect } from "react";
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd";

function ResponsiveAd({ slot, className = "" }) {
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch {
      // AdSense may not be ready yet
    }
  }, []);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default function ScholarshipTipsWinningSOP() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      {/*<section className="mx-auto max-w-6xl px-4 py-10 lg:px-8">*/}
        <section className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="text-sm text-slate-500">
          <Link to="/home" className="hover:text-blue-900">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/scholarship" className="hover:text-blue-900">Scholarship Tips</Link>
          <span className="mx-2">›</span>
          <span>Statement of Purpose</span>
        </div>

        <div className="mt-10 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-800 w-fit">
          Scholarship Tips & Guides
        </div>

        {/*<div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">*/}

  <h1 className="mt-8 max-w-4xl break-words font-serif text-[38px] font-bold leading-[1.12] text-slate-950 sm:text-4xl md:text-6xl">
  How to Write a{" "}
  <span className="italic text-[#163A70]">Winning</span>{" "}
  Statement of Purpose for Scholarship Applications
</h1>

<p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
  Your Statement of Purpose is the one place in a scholarship application
  where you speak directly to the committee. This guide walks you through
  every section — with real examples, common mistakes, and what top
  applicants do differently.
</p>

{/* DESKTOP TOP-RIGHT GOOGLE AD */}
<div className="hidden xl:block">
  <div className="absolute right-4 top-[145px] w-[320px]">
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot="YOUR_TOP_RIGHT_SLOT"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  </div>
</div>

{/*<div className="mt-8 flex flex-wrap items-center gap-4 border-b border-slate-200 pb-8 text-sm text-slate-500">

        
        
          <span className="rounded-full bg-[#163A70] px-3 py-1 font-semibold text-white">
            12 min read
          </span>
          <span>Updated June 2026</span>
          <span>Applies to: Rhodes, Chevening, Fulbright, Commonwealth, RTP & more</span>
        </div>*/}

        

<div className="mt-8 flex max-w-[720px] flex-wrap items-center gap-4 border-y border-slate-200 py-6">

  <div className="flex items-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#163A70] font-serif text-lg font-bold text-white">
      SK
    </div>

    <div className="ml-4 flex-1">
      <p className="font-bold text-slate-950">
        ScholarsKnowledge Editorial
      </p>

      <p className="text-sm text-slate-500">
        Updated June 2026 · Applies to Rhodes, Chevening,
        Fulbright & more
      </p>
    </div>
  </div>

  <span className="rounded-full bg-[#163A70] px-3 py-1.5 text-xs font-bold text-white sm:px-4 sm:py-2 sm:text-sm">
    12 min read
  </span>

</div>
 
{/* HERO IMAGE + RIGHT RESPONSIVE GOOGLE AD */}
<div className="mt-8 mb-2 flex items-start gap-8">
  <div className="max-w-full flex-1 sm:max-w-[720px]">
    <img
      src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80"
      alt="Student writing a scholarship statement of purpose"
      className="h-[280px] w-full rounded-2xl object-cover shadow-sm md:h-[380px]"
    />
  </div>

  {/* GOOGLE ADS - IMAGE RIGHT */}
  <div className="hidden w-[320px] shrink-0 xl:block">
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot="YOUR_IMAGE_RIGHT_SLOT"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  </div>
</div>

{/*<ResponsiveAd
  slot="YOUR_TOP_ARTICLE_SLOT"
  className="mx-auto mt-3 mb-2 max-w-[720px]"
/>*/}
        
          {/*<div className="grid gap-10 pt-12 lg:grid-cols-[minmax(0,1fr)_280px]">*/}
        {/*<div className="grid gap-8 pt-2 lg:grid-cols-[minmax(0,1fr)_320px]">*/}
        {/*<div className="grid gap-8 pt-0 lg:grid-cols-[minmax(0,1fr)_320px]">*/}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
  <article className="max-w-full overflow-hidden lg:max-w-3xl">
    {/*<section id="what-is-sop">*/}
<section id="what-is-sop" className="mt-6">
    <h2 className="break-words font-serif text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
      What is a Statement of Purpose — and why does it matter so much?
    </h2>

    <p className="mt-6 break-words text-base leading-8 text-slate-700 sm:text-lg sm:leading-9">
      A Statement of Purpose (SOP) — sometimes called a Personal Statement or
      Letter of Motivation — is a short essay, typically 500 to 1,500 words,
      that you submit as part of a scholarship or graduate school application.
      It answers one fundamental question:{" "}
      <strong className="text-slate-950">why should we choose you?</strong>
    </p>

    <p className="mt-5 text-lg leading-9 text-slate-700">
      Unlike your academic transcript or your reference letters, the SOP is
      entirely in your hands. It is the only part of your application where the
      committee hears your voice directly. That makes it both the most powerful
      and most misunderstood section of any scholarship application.
    </p>

    <p className="mt-5 text-lg leading-9 text-slate-700">
      Most applicants treat it as a summary of their CV. The strongest
      applicants treat it as a story — one that connects their past experience,
      present motivation, and future goals into a single compelling argument for
      why <em>this</em> scholarship, at <em>this</em> institution, at{" "}
      <em>this</em> moment is the right fit.
    </p>

    <div className="mt-8 overflow-hidden rounded-xl border border-blue-100 border-l-[6px] border-l-[#163A70] bg-blue-50">
  <div className="p-6">
    <h3 className="text-sm font-bold uppercase tracking-widest text-[#163A70]">
      Why committees read SOPs differently than you think
    </h3>

    <p className="mt-3 text-base leading-8 text-[#163A70]">
      Scholarship committees often review hundreds of applications in a short
      window. They are not looking for perfection — they are looking for{" "}
      <strong>clarity, authenticity, and evidence of impact</strong>. A
      well-structured SOP that tells a coherent story will stand out over a
      technically impressive but generic essay every time.
    </p>
  </div>
</div>
  </section>

  <hr className="my-12 border-slate-200" />

  <section id="structure">
    <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
      The structure that works — section by section
    </h2>

    <p className="mt-6 text-lg leading-9 text-slate-700">
      There is no single mandatory format, but the most successful SOPs follow a
      structure that addresses five core questions in order. Here is how to
      allocate your word count:
    </p>

    {/*<div className="mt-8 overflow-hidden rounded-xl border border-slate-200">*/}
      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
  <div className="min-w-[560px] sm:min-w-[720px]">
      <div className="grid grid-cols-[1.1fr_2fr_0.8fr] bg-[#163A70] text-sm font-bold uppercase tracking-widest text-white">
        <div className="p-4">Section</div>
        <div className="p-4">What it covers</div>
        <div className="p-4 text-right">Word %</div>
      </div>
      </div>  

      {[
        ["Opening hook", "A specific moment, observation, or question that launched your interest", "8–12%"],
        ["Academic background", "Relevant coursework, thesis, research — tied to your goals, not a list", "20–25%"],
        ["Professional experience", "Work, volunteering, or projects that prove your readiness", "25–30%"],
        ["Future goals", "Specific, realistic plan — what you will do and who will benefit", "20–25%"],
        ["Why this scholarship", "Specific reasons this program, this institution, this community fits your plan", "15–20%"],
      ].map(([section, covers, pct]) => (
        <div
          key={section}
          className="grid grid-cols-[1.1fr_2fr_0.8fr] border-t border-slate-200 odd:bg-slate-50"
        >
          <div className="p-4 font-bold text-slate-950">{section}</div>
          <div className="p-4 text-slate-700">{covers}</div>
          <div className="p-4 text-right font-bold text-[#163A70]">{pct}</div>
        </div>
      ))}
    </div>
  </section>

  <hr className="my-12 border-slate-200" />

  <section id="writing">
    <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
      Writing each section — step by step
    </h2>

    <div className="mt-8 grid grid-cols-[56px_1fr] gap-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#163A70] font-serif text-xl font-bold text-white">
        1
      </div>
   <div className="min-w-0">
        <h3 className="text-xl font-bold text-slate-950">
          Open with a specific moment, not a general statement
        </h3>

        <p className="mt-4 text-lg leading-9 text-slate-700">
          The most common mistake in scholarship essays is opening with a broad,
          vague sentence. Committees have read thousands of essays that begin
          "Since childhood, I have always been passionate about..." or
          "Education is the most powerful tool in the world." These openings
          signal a generic essay before the reader has even reached the second
          sentence.
        </p>

        <p className="mt-5 text-lg leading-9 text-slate-700">
          Instead, open with a specific, concrete moment — a conversation, an
          observation, a problem you witnessed, a question that you could not
          answer. Ground the reader in your world immediately.
        </p>
      </div>
    </div>

    <div className="mt-8 grid gap-5 md:grid-cols-2">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h4 className="text-sm font-bold uppercase tracking-widest text-red-800">
          × Weak opening
        </h4>
        <ul className="mt-5 space-y-4 text-base leading-7 text-slate-800">
          <li>× Since I was young, I have always been passionate about education and helping others.</li>
          <li>× Education is the key to unlocking a nation's potential.</li>
          <li>× I am applying for this scholarship because I want to pursue a Masters degree in Public Policy.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-800">
          ✓ Strong opening
        </h4>
        <ul className="mt-5 space-y-4 text-base leading-7 text-slate-800">
          <li>
            ✓ In 2019, I sat across from a farmer in rural Tanzania who had just
            lost his entire harvest to a disease he had no name for. I was a
            junior economist. I had charts. He had nothing.
          </li>
          <li>
            ✓ The question I could not answer during my final year dissertation
            — why remittance flows to Sub-Saharan Africa fall during global
            downturns when migrant populations are growing — is the one I intend
            to answer at Oxford.
          </li>
        </ul>
      </div>
    </div>
  </section>


  <hr className="my-12 border-slate-200" />

<div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-5">
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#163A70] font-serif text-xl font-bold text-white">
    2
  </div>

 <div className="min-w-0">
    <h3 className="break-words text-base font-bold leading-snug text-slate-950 sm:text-xl">
      Connect your academic background to your goals — don't just list it
    </h3>

    <p className="mt-2 break-words text-sm leading-7 text-slate-700 sm:mt-4 sm:text-lg sm:leading-9">
      Your transcript already shows what you studied. The Statement of Purpose
      should explain <strong>why</strong> it matters and what you did with that
      knowledge. Instead of repeating every course you completed, select two or
      three academic experiences that directly support your future goals.
    </p>

    <p className="mt-5 text-lg leading-9 text-slate-700">
      If you completed a thesis, dissertation, capstone project, or independent
      research, summarize the research question, your methodology, and the key
      finding in just a few sentences. Scholarship committees are looking for
      evidence that you can identify meaningful problems and pursue them through
      careful analysis.
    </p>

    <div className="mt-8 overflow-hidden rounded-2xl border border-blue-200 border-l-[6px] border-l-[#163A70] bg-blue-50">
  <div className="p-4 sm:p-6">
    <h4 className="font-bold text-[#163A70]">
      Example — connecting academic work to future goals
    </h4>

    <p className="mt-4 break-words text-sm italic leading-7 text-slate-700 sm:text-base sm:leading-8">
      "My Master's thesis at the University at Albany examined bilateral
      remittance flows across fifty country pairs using panel regression and
      fixed-effects estimation. That research revealed that remittance flows
      from high-income host countries responded differently to exchange-rate
      volatility than those from middle-income countries. The unanswered
      question—whether this reflects migrant risk preferences or structural
      differences in financial access—is the research problem I intend to
      explore during my doctoral studies."
    </p>
  </div>
</div>
  </div>
</div>

<hr className="my-12 border-slate-200" />

<div className="grid grid-cols-[56px_1fr] gap-5">
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#163A70] font-serif text-sm font-bold text-white sm:h-14 sm:w-14 sm:text-xl">
    3
  </div>
<div className="min-w-0">
    <h3 className="text-xl font-bold text-slate-950">
      Show professional experience as evidence of impact — not a job list
    </h3>

    <p className="mt-4 text-lg leading-9 text-slate-700">
      Your SOP is not your CV in paragraph form. Scholarship committees already
      know where you worked. What they want to understand is how your work
      changed people, organizations, or communities.
    </p>

    <p className="mt-5 text-lg leading-9 text-slate-700">
      Choose one or two professional experiences and explain your contribution
      using measurable evidence. Numbers help demonstrate credibility and make
      your achievements much easier to evaluate.
    </p>

    <div className="mt-8 max-sm:-ml-[52px] overflow-hidden rounded-2xl border border-emerald-200 border-l-[6px] border-l-emerald-700 bg-emerald-50">
  <div className="p-6">
    <h4 className="font-bold text-emerald-800">
      Example — professional impact
    </h4>

    <p className="mt-4 italic leading-8 text-slate-700">
      "As a Digital Banking Analyst at Akiba Commercial Bank, I managed mobile
      banking operations across eighteen branches while analyzing more than
      100,000 daily transaction records to identify fraud patterns and
      customer behavior trends. After redesigning the onboarding workflow, the
      average activation time fell by 30%, significantly improving customer
      adoption. That experience taught me that data alone never solves
      problems—the real challenge is knowing which questions to ask."
    </p>
  </div>
</div>
  </div>
</div>

<hr className="my-12 border-slate-200" />

<div className="grid grid-cols-[56px_1fr] gap-5">
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#163A70] font-serif text-xl font-bold text-white">
    4
  </div>

  <div className="min-w-0">
    <h3 className="text-xl font-bold text-slate-950">
      State your future goals with specificity and realism
    </h3>

    <p className="mt-4 text-lg leading-9 text-slate-700">
      Scholarship committees prefer realistic goals over ambitious but vague
      promises. Explain the specific problem you hope to solve, who will
      benefit, and how this scholarship will help you achieve that outcome.
    </p>

    <div className="mt-8 max-sm:-ml-[52px] grid gap-5 md:grid-cols-2">
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-6">
        <h4 className="font-bold text-red-700">✗ Vague goals</h4>

        <ul className="mt-5 space-y-3 leading-7">
          <li>I want to help my country develop.</li>
          <li>I hope to become a leader.</li>
          <li>I want to make a positive impact.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-6">
        <h4 className="font-bold text-emerald-700">✓ Specific goals</h4>

        <ul className="mt-5 space-y-3 leading-7">
          <li>
            Join Tanzania's Financial Inclusion Division and design machine
            learning models for agricultural lending.
          </li>

          <li>
            Publish peer-reviewed research on remittance flows within five years
            after graduation.
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>

<hr className="my-12 border-slate-200" />

<div className="grid grid-cols-[56px_1fr] gap-5">
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#163A70] font-serif text-xl font-bold text-white">
    5
  </div>

 <div className="min-w-0">
    <h3 className="text-xl font-bold text-slate-950">
      Explain why this scholarship — not just any scholarship
    </h3>

    <p className="mt-4 text-lg leading-9 text-slate-700">
      This is the section most applicants write last and most briefly — which is
      a mistake, because it is where you demonstrate that you have done your
      research and that this specific opportunity is genuinely the right fit for
      your plan.
    </p>

    <p className="mt-5 text-lg leading-9 text-slate-700">
      For each scholarship, reference named faculty, research groups, programs,
      alumni networks, or institutional resources that directly connect to your
      goals. If your paragraph could be copied into another application without
      changing anything, it is still too generic.
    </p>

    <div className="mt-8 max-sm:-ml-[52px] overflow-hidden rounded-2xl border border-amber-200 border-l-[6px] border-l-amber-700 bg-amber-50">
  <div className="p-6">
    <h4 className="font-bold text-amber-800">
      Example — specific “why this scholarship” paragraph
    </h4>

    <p className="mt-4 italic leading-8 text-slate-700">
      "The Chevening Scholarship is particularly attractive because of its
      emphasis on leadership, public service, and creating long-term
      international partnerships. The opportunity to learn from professionals
      across multiple sectors while engaging with the UK's policy and research
      ecosystem would strengthen my ability to contribute to evidence-based
      economic policymaking in Tanzania."
    </p>
  </div>
</div>
  </div>
</div>

<hr className="my-12 border-slate-200" />

<section id="mistakes">
  <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
    The 7 most common mistakes — and how to fix them
  </h2>

  {[
    [
      "1. Starting with a definition or a quote",
      "Opening with a famous quote or dictionary-style definition usually signals that you have not found your own voice. Use your own words to describe your own experience.",
    ],
    [
      "2. Repeating what is already on your CV",
      "The committee has your CV. The SOP should interpret your experience, not list it. Every paragraph should reveal motivation, judgment, growth, or future direction.",
    ],
    [
      "3. Being too modest or too self-promotional",
      "Both extremes weaken your application. State what you have done, what you learned, and what you plan to do in clear, direct language.",
    ],
    [
      "4. Writing one SOP for all applications",
      "The 'why this scholarship' section must be customized for every application. Rhodes, Chevening, Fulbright, Commonwealth, and RTP scholarships have different missions.",
    ],
    [
      "5. Exceeding the word limit",
      "Going over the word count signals that you cannot follow instructions. Treat the limit as a strict requirement, not a suggestion.",
    ],
    [
      "6. Neglecting the editing process",
      "Most strong SOPs go through multiple drafts. Ask for feedback from someone who can identify unclear logic, not only grammar mistakes.",
    ],
    [
      "7. Saving it until the last week",
      "A strong SOP needs reflection, drafting, feedback, and revision. Start six to eight weeks before the deadline when possible.",
    ],
  ].map(([title, text]) => (
    <div key={title} className="mt-7">
      <h3 className="text-lg font-bold text-[#163A70]">{title}</h3>
      <p className="mt-2 text-lg leading-8 text-slate-700">{text}</p>
    </div>
  ))}
</section>

<hr className="my-12 border-slate-200" />

<section id="checklist">
  <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
    Pre-submission checklist
  </h2>

  <p className="mt-6 text-lg leading-9 text-slate-700">
    Before you submit, go through every item below. If any box is unticked,
    revise before sending.
  </p>

  <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
    {[
      "My opening sentence is specific — it names a real moment, question, or observation.",
      "Every paragraph serves a clear purpose.",
      "I have named specific faculty, programs, or initiatives at the host institution.",
      "My goals are specific — I name a problem, a context, and a realistic pathway.",
      "I have not exceeded the word count.",
      "I have not started too many sentences with “I” in a row.",
      "I have read the essay aloud and it sounds natural.",
      "At least one person who knows my work has reviewed a draft.",
      "I have followed the scholarship’s specific SOP instructions.",
      "The 'why this scholarship' section cannot be copied into another application without being rewritten.",
    ].map((item) => (
      <div key={item} className="flex gap-3 p-4 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
        <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-[#163A70] sm:h-5 sm:w-5" />
        <span className="leading-7">{item}</span>
      </div>
    ))}
  </div>
</section>

<div className="mt-14 rounded-2xl bg-[#163A70] p-5 text-center text-white sm:rounded-3xl sm:p-8">
  <h3 className="break-words font-serif text-2xl font-bold sm:text-3xl">
    Ready to find the right scholarship to apply for?
  </h3>

  <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/80">
    Browse verified, fully-funded scholarships from universities and institutions
    across 150+ countries — organized by destination, level of study, and
    deadline.
  </p>

  <div className="mt-7 flex flex-wrap justify-center gap-3">
    <Link
      to="/scholarship"
      className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-[#163A70] hover:bg-amber-300"
    >
      Browse Scholarships
    </Link>

    <Link
      to="/student-sign-up"
      className="w-full rounded-full bg-amber-400 px-6 py-3 text-center text-sm font-bold text-[#163A70] transition hover:bg-amber-300 sm:w-auto"
    >
      Create Free Account
    </Link>
  </div>
</div>

<section>
  <h2 className="font-serif text-3xl font-bold text-slate-950">
    Related guides
  </h2>

  <p className="mt-3 text-lg leading-8 text-slate-700">
    Continue learning with more practical scholarship application guides from
    ScholarsKnowledge.
  </p>

  <div className="mt-8 grid gap-6 md:grid-cols-2">
    <Link
      to="/scholarship-tips/recommendation-letters"
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#163A70] hover:shadow-lg"
    >
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#163A70]">
        Scholarship Tips
      </span>

      <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-[#163A70]">
        How to Get Strong Recommendation Letters for International Scholarships
      </h3>

      <p className="mt-3 leading-7 text-slate-600">
        Learn how to request recommendation letters that genuinely strengthen
        your scholarship application.
      </p>

      <div className="mt-6 font-semibold text-[#163A70]">
        Read guide →
      </div>
    </Link>

    <Link
      to="/scholarship-tips/rhodes-vs-chevening-vs-fulbright"
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#163A70] hover:shadow-lg"
    >
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#163A70]">
        Scholarship Tips
      </span>

      <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-[#163A70]">
        Rhodes vs Chevening vs Fulbright — Which Scholarship Fits You?
      </h3>

      <p className="mt-3 leading-7 text-slate-600">
        Compare three of the world's most competitive scholarships and discover
        which one best matches your profile.
      </p>

      <div className="mt-6 font-semibold text-[#163A70]">
        Read guide →
      </div>
    </Link>

    <Link
      to="/scholarship-tips/nigeria-scholarships-2026"
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#163A70] hover:shadow-lg"
    >
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#163A70]">
        Scholarship Tips
      </span>

      <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-[#163A70]">
        10 Scholarships Open to Nigerian Students in 2026
      </h3>

      <p className="mt-3 leading-7 text-slate-600">
        Explore fully funded opportunities currently accepting applications from
        Nigerian students.
      </p>

      <div className="mt-6 font-semibold text-[#163A70]">
        Read guide →
      </div>
    </Link>

    <Link
      to="/scholarship-tips/funding-masters-degree"
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#163A70] hover:shadow-lg"
    >
      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">
        EduFinancing
      </span>

      <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-[#163A70]">
        How to Fund a Master's Degree Abroad with No Family Savings
      </h3>

      <p className="mt-3 leading-7 text-slate-600">
        Practical funding strategies, scholarships, assistantships, and grants
        that reduce the cost of studying overseas.
      </p>

      <div className="mt-6 font-semibold text-[#163A70]">
        Read guide →
      </div>
    </Link>
  </div>
</section>

<hr className="my-14 border-slate-200" />


</article>




         
          <aside className="hidden lg:block">
  <div className="sticky top-24 space-y-5">

    {/* IN THIS ARTICLE */}
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
        In this article
      </h3>

      <div className="mt-5 space-y-4 text-sm text-slate-700">
        <a href="#what-is-sop" className="block hover:text-[#163A70]">
          What is a Statement of Purpose?
        </a>

        <a href="#structure" className="block hover:text-[#163A70]">
          The structure that works
        </a>

        <a href="#writing" className="block hover:text-[#163A70]">
          Writing each section
        </a>

        <a href="#mistakes" className="block hover:text-[#163A70]">
          7 common mistakes
        </a>

        <a href="#checklist" className="block hover:text-[#163A70]">
          Pre-submission checklist
        </a>
      </div>
    </div>

    {/* MORE GUIDES */}
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
        More guides
      </h3>

      <div className="mt-5 space-y-4">
        <Link
          to="/scholarship-tips"
          className="block border-b border-slate-100 pb-4 hover:text-[#163A70]"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            Application Guides
          </p>
          <p className="mt-1 text-sm font-semibold leading-6">
            Browse all scholarship application guides
          </p>
        </Link>

        <Link
          to="/scholarship-tips/recommendation-letters"
          className="block border-b border-slate-100 pb-4 hover:text-[#163A70]"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            Letters
          </p>
          <p className="mt-1 text-sm font-semibold leading-6">
            How to Get Strong Recommendation Letters
          </p>
        </Link>

        <Link
          to="/scholarship-tips/research-proposal"
          className="block hover:text-[#163A70]"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            Research
          </p>
          <p className="mt-1 text-sm font-semibold leading-6">
            How to Write a Research Proposal
          </p>
        </Link>
      </div>
    </div>

    {/* GOOGLE ADS - SIDEBAR RESPONSIVE */}
<GoogleSidebarAd
  className="mx-auto mt-2 mb-0 w-full"
  keepPlaceholder={false}
/>

    {/* CTA */}
   <div className="rounded-2xl border border-[#163A70] bg-[#163A70] p-5 text-white sm:p-6">
      <h3 className="break-words font-serif text-lg font-bold sm:text-xl">
        Browse scholarships
      </h3>

      <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
        Find fully funded opportunities across 150+ countries.
      </p>

      <Link
  to="/scholarship"
  className="mt-5 inline-flex w-full justify-center rounded-full bg-[#D4AF37] px-5 py-2 text-center text-sm font-bold text-[#163A70] sm:w-auto"
>
        Explore now →
      </Link>
    </div>
  </div>
</aside>
        </div>
      </section>

    <footer className="w-full border-t border-slate-200 bg-slate-50">
  <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">

    <div className="grid gap-12 md:grid-cols-3">

      {/* In this guide */}
      <div className="min-w-0">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          In This Guide
        </h3>

        <div className="mt-5 space-y-4">
          <a href="#what-is-sop" className="block hover:text-[#163A70]">
            What is a Statement of Purpose?
          </a>

          <a href="#structure" className="block hover:text-[#163A70]">
            The structure that works
          </a>

          <a href="#writing" className="block hover:text-[#163A70]">
            Writing each section
          </a>

          <a href="#mistakes" className="block hover:text-[#163A70]">
            7 common mistakes
          </a>

          <a href="#checklist" className="block hover:text-[#163A70]">
            Pre-submission checklist
          </a>
        </div>
      </div>

      {/* Share */}
      <div className="min-w-0">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Share this guide
        </h3>

        <div className="mt-5 flex gap-3">
          <button className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 hover:border-[#163A70] hover:bg-white">
            🔗
          </button>

          <button className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 hover:border-[#163A70] hover:bg-white">
            ✉
          </button>
        </div>
      </div>

      {/* Brand */}
      <div className="md:text-right">
        <h2 className="font-serif text-3xl font-bold text-[#163A70]">
          Scholars<span className="text-amber-500">Knowledge</span>
        </h2>

        <p className="mt-4 text-slate-600 leading-8">
          Helping students discover verified scholarships,
          fellowships, funded graduate opportunities,
          and expert application guidance.
        </p>

        <div className="mt-6 flex flex-wrap justify-start gap-5 text-sm text-slate-500 md:justify-end">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          © 2026 ScholarsKnowledge. All rights reserved.
        </p>
      </div>

    </div>

  </div>
</footer>

    </main>
  );
}