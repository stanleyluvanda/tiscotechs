import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd";

export default function ScholarshipTipsResearchProposal() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="text-sm text-slate-500">
          <Link to="/home" className="hover:text-blue-900">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/scholarship-tips" className="hover:text-blue-900">
            Scholarship Tips
          </Link>
          <span className="mx-2">›</span>
          <span>Research Proposal</span>
        </div>

        <div className="mt-10 w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-800">
          Research Writing
        </div>

        <h1 className="mt-8 max-w-4xl font-serif text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
          How to Write a Research Proposal for Scholarship Applications
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
          PhD and research master&apos;s applications often require a proposal
          that proves you can frame, plan, and execute independent academic
          research. This guide shows you how to build one clearly.
        </p>

        {/* DESKTOP TOP-RIGHT GOOGLE AD */}
        <div className="hidden xl:block">
          <div className="absolute right-4 top-[220px] w-[320px]">
            <GoogleSidebarAd className="h-[280px]" />
          </div>
        </div>

        <div className="mt-8 flex max-w-[720px] items-center justify-between border-y border-slate-200 py-6">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#163A70] font-serif text-lg font-bold text-white">
              SK
            </div>

            <div className="ml-4 flex-1">
              <p className="font-bold text-slate-950">
                ScholarsKnowledge Editorial
              </p>

              <p className="text-sm text-slate-500">
                Updated June 2026 · Applies to Rhodes, Chevening, Fulbright & more
              </p>
            </div>
          </div>

          <span className="whitespace-nowrap rounded-full bg-[#163A70] px-4 py-2 text-sm font-bold text-white">
            18 min read
          </span>
        </div>

        {/* HERO IMAGE + RIGHT RESPONSIVE GOOGLE AD */}
        <div className="mt-8 mb-2 flex items-start gap-8">
          <div className="max-w-[720px] flex-1">
            <img
              src="https://images.unsplash.com/photo-1532094349884-543559244d98?w=1200&q=80"
              alt="PhD student working on research in a university library"
              className="h-[280px] w-full rounded-2xl object-cover shadow-sm md:h-[380px]"
            />
          </div>

          <div className="hidden w-[320px] shrink-0 xl:block">
            <GoogleSidebarAd />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="max-w-3xl">
            <section id="what" className="mt-6">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                What a research proposal actually is
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A research proposal is a document — typically 1,000 to 2,500
                words — that argues that a specific research question is worth
                investigating, that you are the right person to investigate it,
                and that your proposed approach is credible and achievable
                within the program.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                For scholarship and funding applications, the proposal is more
                than a school assignment. It is a persuasive academic plan. The
                committee wants to see that you understand the problem, know the
                conversation already happening in your field, can identify what
                is still missing, and can explain how your work will address
                that missing piece. A strong proposal does not simply announce a
                topic. It builds a case for why the topic matters, why your
                approach is suitable, and why the award should support the work.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Think of the proposal as a bridge between your academic past and
                your future research. Your transcripts, CV, statement of purpose,
                and recommendation letters show what you have already done. The
                research proposal shows what you are ready to do next. It should
                convince reviewers that your idea is worthwhile, your plan is
                realistic, and your preparation matches the project you are
                proposing.
              </p>

              <div className="mt-8 overflow-hidden rounded-xl border border-blue-100 border-l-[6px] border-l-[#163A70] bg-blue-50">
                <div className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#163A70]">
                    Common mistake
                  </h3>
                  <p className="mt-3 text-base leading-8 text-[#163A70]">
                    Applicants often write proposals that are too broad. “I will
                    study climate change and economic development in Africa” is
                    too general. A strong proposal is narrow enough to be studied
                    with clear data, methods, and scope.
                  </p>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="reviewers">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                What scholarship reviewers are really looking for
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Reviewers normally read many applications in a short period of
                time, often from different academic backgrounds. This means your
                proposal must be academically serious but still readable to a
                broad committee. A specialist should respect the depth of your
                thinking, while a non-specialist should still understand the
                problem, the method, and the value of the project.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A strong proposal usually answers three questions clearly. First,
                is the project worth doing? Second, can this applicant complete
                it within the available time, resources, and degree structure?
                Third, does the project fit the university, supervisor,
                department, laboratory, archive, field site, or funding mission?
                If one of these answers is unclear, the proposal becomes weaker
                even if the topic itself is interesting.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {[
                  [
                    "Worthwhile",
                    "The proposal identifies a meaningful problem, explains the gap in current knowledge, and shows why the project deserves attention.",
                  ],
                  [
                    "Feasible",
                    "The project has a realistic scope, appropriate methods, available data or sources, and a timeline that matches the degree or award period.",
                  ],
                  [
                    "Well matched",
                    "The applicant explains why this university, supervisor, program, laboratory, field location, or funding opportunity is the right environment for the work.",
                  ],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="font-bold text-slate-950">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="structure">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                The six sections every strong proposal includes
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Committees are not expecting you to have completed the research
                already. They are evaluating whether you understand the field,
                whether your question is original, whether your methodology is
                appropriate, and whether you can realistically complete the
                project.
              </p>

              {[
                [
                  "1",
                  "Title and abstract",
                  "Write a clear title that names your question, population, and method. The abstract should summarize the gap, question, approach, and expected contribution.",
                ],
                [
                  "2",
                  "Introduction and background",
                  "Set the context. What is the broader field? What do we know already? What gap in existing knowledge will your research address?",
                ],
                [
                  "3",
                  "Research question and objectives",
                  "State your main research question clearly. Break it into two or three specific objectives that can be achieved within the program timeframe.",
                ],
                [
                  "4",
                  "Methodology",
                  "Describe your approach. Will your study be qualitative, quantitative, or mixed-methods? What data will you use? Why is this method appropriate?",
                ],
                [
                  "5",
                  "Expected contribution and significance",
                  "Explain who will benefit and how. Show the academic, policy, or practical value of the research without overstating the impact.",
                ],
                [
                  "6",
                  "Timeline and references",
                  "Give a realistic plan for completing each phase and include references for all cited academic work.",
                ],
              ].map(([num, title, text]) => (
                <div key={title} className="mt-8 grid grid-cols-[56px_1fr] gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#163A70] font-serif text-xl font-bold text-white">
                    {num}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">
                      {title}
                    </h3>
                    <p className="mt-4 text-lg leading-9 text-slate-700">
                      {text}
                    </p>
                  </div>
                </div>
              ))}

              <div className="mt-10 overflow-hidden rounded-2xl border border-amber-200 border-l-[6px] border-l-amber-500 bg-amber-50">
                <div className="p-6">
                  <h3 className="font-bold text-amber-900">
                    Professional tip
                  </h3>
                  <p className="mt-3 text-base leading-8 text-amber-900/90">
                    Do not treat these sections as isolated boxes. The strongest
                    proposals have a logical chain: the background leads to the
                    gap, the gap leads to the question, the question leads to the
                    method, and the method leads to the expected contribution.
                    If one part does not connect to the next, revise the flow.
                  </p>
                </div>
              </div>
            </section>

            <GoogleSidebarAd
              className="mx-auto my-10 max-w-[720px]"
            />

            <hr className="my-12 border-slate-200" />

            <section id="question">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                How to identify a strong research question
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A good research question is specific, original, and feasible. It
                should not be so broad that it becomes impossible to answer, and
                it should not be so narrow that it has no academic or practical
                significance.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A useful way to build a research question is to move from topic
                to problem, from problem to gap, and from gap to question. The
                topic identifies the general area. The problem explains what is
                unresolved, contested, under-studied, or poorly understood. The
                gap shows what existing scholarship has not yet explained. The
                question turns that gap into something you can investigate with
                a method, dataset, archive, experiment, field site, or analytical
                framework.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                  <h4 className="font-bold text-red-800">✗ Too broad</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>I will study poverty in Africa.</li>
                    <li>I will research climate change and development.</li>
                    <li>I will examine education problems in developing countries.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                  <h4 className="font-bold text-emerald-800">✓ Stronger</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>
                      I will examine whether mobile money adoption among
                      smallholder farmers in Tanzania mediates the relationship
                      between rainfall volatility and household income stability.
                    </li>
                    <li>
                      I will assess how school feeding programs affect attendance
                      among rural primary school students in Northern Ghana.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-950">
                  A simple test for your research question
                </h3>
                <p className="mt-4 text-base leading-8 text-slate-700">
                  After writing your question, ask yourself whether a reviewer
                  can identify the subject, population or case, location or
                  context, method or evidence, and expected contribution. If the
                  question hides these details, it may still be an idea rather
                  than a researchable question. A proposal can begin with an
                  idea, but it must end with a question that can be answered.
                </p>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="gap">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                How to explain the research gap without sounding vague
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Many weak proposals say that “there is a gap in the literature”
                but never explain what the gap is. A research gap is not simply
                the absence of studies on your exact topic. It is a specific
                limitation in existing knowledge that affects how scholars,
                policymakers, practitioners, communities, or institutions
                understand a problem.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Your literature review should therefore do more than list
                previous studies. It should show how the field has developed,
                what scholars agree on, where they disagree, what methods have
                been used, and what remains unresolved. In a scholarship
                proposal, this section can be short, but it must be selective
                and analytical. Choose the most relevant works and explain how
                they shape your project.
              </p>

              <div className="mt-8 overflow-hidden rounded-2xl border border-blue-200 border-l-[6px] border-l-[#163A70] bg-blue-50">
                <div className="p-6">
                  <h3 className="font-bold text-[#163A70]">
                    Strong gap language
                  </h3>
                  <p className="mt-3 text-base leading-8 text-[#163A70]">
                    Instead of writing, “Not much research has been done,” write
                    with more precision: “Existing studies have examined X in
                    urban settings, but fewer studies have tested whether the
                    same relationship holds in rural districts where financial
                    infrastructure, household risk, and market access differ.”
                  </p>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="originality">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                How to show originality without exaggerating
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Originality does not always mean inventing a completely new
                field. In many graduate proposals, originality comes from asking
                a sharper question, studying a new case, applying an existing
                theory to a different context, using a stronger dataset,
                comparing cases that have not been studied together, or bringing
                two literatures into conversation. What matters is that the
                reader can see how your project adds something meaningful to
                what already exists.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Avoid overstating your contribution. Phrases such as “this
                research will solve poverty” or “this study will transform the
                entire field” can make the proposal sound unrealistic. A more
                credible contribution is specific: the study will clarify a
                relationship, test a hypothesis, produce evidence from an
                under-studied context, develop a framework, evaluate an
                intervention, reinterpret a text, or improve understanding of a
                particular mechanism.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                  <h4 className="font-bold text-slate-950">Originality can come from</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-700">
                    <li>A new population, country, sector, period, or archive.</li>
                    <li>A new combination of theories or disciplines.</li>
                    <li>A better method, dataset, model, or research design.</li>
                    <li>A clearer explanation of why previous findings differ.</li>
                    <li>A practical application of existing academic knowledge.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="font-bold text-slate-950">Avoid claiming</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-700">
                    <li>That no one has ever studied the topic unless you can prove it.</li>
                    <li>That your project will solve a complex problem alone.</li>
                    <li>That the findings are guaranteed before research begins.</li>
                    <li>That the project is original only because it matters to you personally.</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="methodology">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Writing the methodology section
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Your methodology should convince the reader that your question
                can actually be answered. Do not simply say “I will use mixed
                methods.” Explain what data you will collect, how you will
                collect it, what analytical framework you will use, and why that
                approach fits the question.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                The methodology is where many proposals become either convincing
                or weak. A strong methods section shows logical alignment between
                the question and the evidence. If your question asks about
                lived experiences, interviews, focus groups, ethnography, or
                qualitative content analysis may be appropriate. If your question
                tests a relationship between variables, you may need survey
                data, administrative data, experiments, econometric methods, or
                statistical modeling. If your project interprets texts, images,
                laws, historical records, or cultural objects, you must explain
                the analytical framework that will guide your interpretation.
              </p>

              <div className="mt-8 overflow-hidden rounded-2xl border border-blue-200 border-l-[6px] border-l-[#163A70] bg-blue-50">
                <div className="p-6">
                  <h4 className="font-bold text-[#163A70]">
                    Methodology checklist
                  </h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>What type of data will you use?</li>
                    <li>Where will the data come from?</li>
                    <li>What sample, population, or case will you study?</li>
                    <li>What analytical method will you apply?</li>
                    <li>Why is this method appropriate for your question?</li>
                    <li>What limitations should the committee know about?</li>
                  </ul>
                </div>
              </div>

              <p className="mt-8 text-lg leading-9 text-slate-700">
                Good methodology writing is specific but not overloaded. You do
                not need to write a full textbook chapter. You need to give the
                reviewer enough detail to believe that the project can be done.
                Mention the source of your data, how you will access it, what
                variables or materials matter, how you will analyze the evidence,
                and what risks or limitations you have considered.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="discipline">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Adjust the proposal to your discipline
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Research proposals do not look identical across fields. A
                proposal in economics, engineering, education, public health,
                English, environmental science, business, or sociology may use
                different evidence and methods. However, every discipline still
                expects the same basic logic: a clear problem, a justified
                question, a credible method, and a contribution that matters.
              </p>

              <div className="mt-8 space-y-5">
                {[
                  [
                    "Humanities",
                    "Emphasize texts, archives, historical context, theory, interpretation, and critical dialogue. Show which scholars or traditions shape your approach and explain how your reading will add a new interpretation.",
                  ],
                  [
                    "Social sciences",
                    "Clarify whether the project is qualitative, quantitative, or mixed-methods. Explain the population, cases, variables, interviews, surveys, datasets, fieldwork, or models that will help answer the question.",
                  ],
                  [
                    "STEM and engineering",
                    "State the hypothesis, experiment, model, design problem, technical challenge, or system being tested. Explain equipment, data, measurement, feasibility, safety, and the specific part of the wider project you will own.",
                  ],
                  [
                    "Arts and design",
                    "Explain the creative problem, medium, audience, artistic influences, production plan, and final output. Show how the project is original while still connected to current artistic or design conversations.",
                  ],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                    <p className="mt-3 text-base leading-8 text-slate-700">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <GoogleSidebarAd
              className="mx-auto my-10 max-w-[720px]"
            />

            <hr className="my-12 border-slate-200" />

            <section id="timeline">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Build a realistic timeline and work plan
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A timeline is not a decoration at the end of the proposal. It
                is evidence that you understand the work required. Scholarship
                committees want to know that the project can be completed within
                the funding period, degree timeline, fieldwork window, lab
                schedule, archive availability, or academic calendar.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Divide the project into phases: literature review, research
                design, ethics approval if needed, data collection, analysis,
                writing, revision, and dissemination. If your project requires
                travel, field access, equipment, language skills, institutional
                permission, or supervisor support, show that you have considered
                those practical requirements. A reviewer should not feel that
                your plan depends on luck.
              </p>

              <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                {[
                  ["Phase 1", "Refine research question, complete focused literature review, and finalize theoretical or analytical framework."],
                  ["Phase 2", "Confirm data access, field site arrangements, ethics requirements, equipment needs, or archive availability."],
                  ["Phase 3", "Collect data, conduct interviews, run experiments, gather texts, build models, or complete field observations."],
                  ["Phase 4", "Analyze evidence, compare findings with existing literature, and identify the contribution of the study."],
                  ["Phase 5", "Write, revise, receive supervisor feedback, prepare presentation, article, thesis chapter, policy brief, or final report."],
                ].map(([phase, text]) => (
                  <div key={phase} className="grid gap-3 p-5 md:grid-cols-[100px_1fr]">
                    <p className="font-bold text-[#163A70]">{phase}</p>
                    <p className="leading-7 text-slate-700">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="fit">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Show preparation, mentorship, and institutional fit
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A proposal becomes stronger when it shows that you are prepared
                to carry out the project. Preparation can include coursework,
                a master&apos;s thesis, professional experience, language ability,
                technical training, field knowledge, laboratory work, previous
                conference presentations, preliminary reading, pilot interviews,
                or contact with a potential supervisor.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Institutional fit matters especially for PhD and research-based
                master&apos;s applications. Do not simply write that a university is
                “prestigious.” Explain why its faculty, research centers,
                laboratories, archives, datasets, community partnerships,
                methods training, or regional expertise make it the right place
                for your project. If a supervisor&apos;s work aligns with your
                research, name the intellectual connection rather than only
                praising the person.
              </p>

              <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-200 border-l-[6px] border-l-emerald-600 bg-emerald-50">
                <div className="p-6">
                  <h3 className="font-bold text-emerald-900">
                    Better fit statement
                  </h3>
                  <p className="mt-3 text-base leading-8 text-emerald-900/90">
                    Instead of writing, “Your university is world-class,” write:
                    “The department&apos;s work on migration, labor markets, and
                    applied microeconomics provides a strong environment for my
                    proposed study of remittance behavior and household risk.
                    The opportunity to receive methods training in causal
                    inference would directly strengthen the empirical design of
                    this project.”
                  </p>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="significance">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Explain significance, outcomes, and impact carefully
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                The significance section answers the reviewer&apos;s “so what?”
                question. Why should anyone care about the project after reading
                the title and method? The strongest answers are specific. They
                explain how the research may clarify a debate, fill a knowledge
                gap, improve a model, inform policy, support community decision
                making, strengthen institutional practice, or open a path for
                future research.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                For scholarship applications, impact can be academic, practical,
                public, professional, or social. However, impact should be
                connected to the actual scale of your project. A small master&apos;s
                project may not change national policy, but it can produce
                evidence that helps understand a local program, compare cases,
                evaluate a specific intervention, or identify questions for
                larger future studies. Reviewers often trust applicants who are
                ambitious but measured.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                  <h4 className="font-bold text-[#163A70]">Academic contribution</h4>
                  <p className="mt-3 leading-8 text-slate-800">
                    What concept, theory, method, literature, dataset, archive,
                    case, or debate will your project help develop?
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                  <h4 className="font-bold text-amber-900">Broader impact</h4>
                  <p className="mt-3 leading-8 text-slate-800">
                    Who could use the findings, how could they use them, and
                    what practical decision or understanding could improve?
                  </p>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="budget-ethics">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Do not ignore budget, ethics, and access
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Some scholarship applications ask for a budget, while others do
                not. When a budget is required, it should match the research
                plan. Every cost should have a purpose: travel, fieldwork,
                transcription, software, participant compensation, materials,
                equipment, archive fees, data access, or living support during
                the research period. A vague or inflated budget can weaken an
                otherwise strong proposal.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Ethics and access are also part of feasibility. If your project
                involves human participants, personal data, clinical settings,
                schools, vulnerable groups, animals, sensitive archives, or
                restricted field sites, acknowledge the relevant approval process.
                You do not need to have every approval completed before applying
                unless the funder requires it, but you should show that you
                understand what approval or permission will be needed.
              </p>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-bold text-slate-950">
                  Feasibility questions to answer early
                </h3>
                <ul className="mt-5 space-y-3 leading-7 text-slate-700">
                  <li>Can you access the data, archive, community, lab, software, or field site?</li>
                  <li>Will the project require ethics approval or institutional permission?</li>
                  <li>Do you have the language, technical, statistical, or field skills required?</li>
                  <li>Is the project possible within the funding period and degree timeline?</li>
                  <li>Have you identified a backup plan if one data source becomes unavailable?</li>
                </ul>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="scholarship-vs-phd">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Scholarship proposal vs. PhD proposal vs. grant proposal
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                The same research idea may need different emphasis depending on
                the application. A PhD proposal usually focuses on academic fit,
                originality, feasibility, and the supervision environment. A
                scholarship proposal often places more weight on why the project
                deserves funding and how the applicant&apos;s record shows promise.
                A grant proposal may require more detail on budget, deliverables,
                timeline, team roles, dissemination, and measurable outcomes.
              </p>

              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-0 md:grid-cols-3">
                  {[
                    [
                      "Scholarship",
                      "Persuades a funder that your academic promise, proposed research, leadership, and potential contribution deserve financial support.",
                    ],
                    [
                      "PhD admission",
                      "Persuades a department that your project is suitable for doctoral study and fits available supervision and resources.",
                    ],
                    [
                      "Research grant",
                      "Persuades a funder that a defined project, budget, team, method, and output are valuable and deliverable.",
                    ],
                  ].map(([title, text]) => (
                    <div key={title} className="border-b border-slate-200 p-6 md:border-b-0 md:border-r last:md:border-r-0">
                      <h3 className="font-bold text-slate-950">{title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="examples">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                How to use examples without copying them
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Reading successful proposal examples can help you understand
                structure, tone, and level of detail. However, examples should
                be used as models of reasoning, not as language to copy. Your
                research question, evidence, location, discipline, and argument
                are different. Copying a sample can also make your proposal feel
                generic because it will not match your actual project.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                When studying examples, pay attention to how the writer moves
                from problem to literature, from literature to gap, from gap to
                question, and from question to method. Notice how transitions
                guide the reviewer. Then create your own outline using the same
                logic. The goal is not to sound like someone else; the goal is
                to make your own project easier to follow.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                  <h4 className="font-bold text-emerald-800">Use examples to learn</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>How sections are ordered.</li>
                    <li>How the problem is introduced.</li>
                    <li>How the literature review supports the gap.</li>
                    <li>How methods are linked to the question.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                  <h4 className="font-bold text-red-800">Do not copy</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>Titles, abstracts, or sample paragraphs.</li>
                    <li>Research questions from another applicant.</li>
                    <li>Methodology wording that does not match your work.</li>
                    <li>Claims about impact that you cannot support.</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="style">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Write clearly for specialists and non-specialists
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Scholarship reviewers may include people outside your exact
                field. This does not mean you should make the proposal shallow.
                It means you should define key terms, avoid unnecessary jargon,
                and explain why technical details matter. Clear writing signals
                intellectual control. If you cannot explain the project clearly,
                reviewers may doubt whether the project is fully developed.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Use active voice when it helps show ownership. Instead of saying
                “data will be collected,” write “I will collect household survey
                data” or “I will analyze administrative records.” This makes
                your role visible. It also helps reviewers distinguish your
                independent project from work done by a supervisor, laboratory,
                employer, government office, nonprofit organization, or research
                group.
              </p>

              <div className="mt-8 overflow-hidden rounded-2xl border border-blue-200 border-l-[6px] border-l-[#163A70] bg-blue-50">
                <div className="p-6">
                  <h3 className="font-bold text-[#163A70]">
                    Revision rule
                  </h3>
                  <p className="mt-3 text-base leading-8 text-[#163A70]">
                    After drafting, underline every sentence that states what
                    you will do, why it matters, and how you will do it. If a
                    paragraph contains none of those things, revise it or remove
                    it. Proposal space is limited, so every paragraph must earn
                    its place.
                  </p>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="mistakes">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Common mistakes that weaken research proposals
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Most unsuccessful proposals do not fail because the student is
                incapable. They often fail because the proposal is unclear,
                overambitious, poorly connected to existing scholarship, or
                missing practical details. Reviewers need confidence. Anything
                that creates uncertainty can reduce that confidence.
              </p>

              <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                {[
                  "The proposal introduces a broad topic but never states a precise research question.",
                  "The literature review summarizes sources but does not identify a gap or debate.",
                  "The methodology names a method but does not explain data, sample, analysis, or access.",
                  "The project is too large for the degree, funding period, budget, or applicant's current preparation.",
                  "The expected contribution sounds exaggerated or disconnected from the actual study design.",
                  "The applicant sends the same proposal to every university without adapting institutional fit.",
                  "The writing relies on jargon, passive voice, and long sentences that hide the main argument.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 p-4 text-slate-700">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-red-500" />
                    <span className="leading-7">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <GoogleSidebarAd
              className="mx-auto my-10 max-w-[720px]"
            />

            <hr className="my-12 border-slate-200" />

            <section id="checklist">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Pre-submission checklist
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Before submitting your proposal, check that each section is clear,
                specific, and realistic.
              </p>

              <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                {[
                  "My research question is specific and answerable.",
                  "I have identified a clear gap in the literature.",
                  "My methodology matches the research question.",
                  "I have explained what data or sources I will use.",
                  "My project is realistic within the program timeline.",
                  "I have not overstated the expected contribution.",
                  "My references are relevant and properly formatted.",
                  "My timeline includes practical steps, not only broad intentions.",
                  "I have explained why this university, supervisor, program, or funder fits the project.",
                  "I have considered ethics, access, budget, risks, and limitations where relevant.",
                  "A non-specialist reader can understand the problem and significance.",
                  "I have followed the funder's word count, formatting rules, and required sections exactly.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 p-4 text-slate-700">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-[#163A70]" />
                    <span className="leading-7">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="faqs">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Research proposal FAQs
              </h2>

              <div className="mt-8 space-y-5">
                {[
                  [
                    "How long should a scholarship research proposal be?",
                    "Follow the exact instruction from the scholarship body or university. If no length is provided, many graduate proposals fall around 1,000 to 2,500 words, but some fellowships request shorter statements while others allow several pages. Never exceed a stated word or page limit.",
                  ],
                  [
                    "Do I need final results before applying?",
                    "No. A proposal is a plan, not a completed thesis. You should show a strong question, relevant literature, a credible method, and possible outcomes. You do not need to present findings that you have not yet produced.",
                  ],
                  [
                    "Can I use the same proposal for multiple universities?",
                    "You can keep the same core research idea, but each version should be adapted. The fit section should reflect the specific supervisor, department, resources, country, archive, laboratory, or funding mission of that opportunity.",
                  ],
                  [
                    "Should I write in first person?",
                    "In many proposal contexts, first person is acceptable and useful because it shows ownership. Write clearly: “I will analyze,” “I will compare,” or “I will conduct interviews.” If your department prefers a different style, follow its instructions.",
                  ],
                  [
                    "What if my project changes after admission?",
                    "That is normal. Committees know that research evolves. Your proposal should still be thoughtful, feasible, and well justified at the time of application because it demonstrates your ability to plan independent research.",
                  ],
                ].map(([question, answer]) => (
                  <div key={question} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-950">{question}</h3>
                    <p className="mt-3 leading-8 text-slate-700">{answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <GoogleSidebarAd
              className="mx-auto my-10 max-w-[720px]"
            />
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  In this article
                </h3>

                <div className="mt-5 space-y-4 text-sm text-slate-700">
                  <a href="#what" className="block hover:text-[#163A70]">
                    What a research proposal is
                  </a>
                  <a href="#reviewers" className="block hover:text-[#163A70]">
                    What reviewers look for
                  </a>
                  <a href="#structure" className="block hover:text-[#163A70]">
                    Six proposal sections
                  </a>
                  <a href="#question" className="block hover:text-[#163A70]">
                    Strong research question
                  </a>
                  <a href="#gap" className="block hover:text-[#163A70]">
                    Research gap
                  </a>
                  <a href="#methodology" className="block hover:text-[#163A70]">
                    Methodology section
                  </a>
                  <a href="#timeline" className="block hover:text-[#163A70]">
                    Timeline and work plan
                  </a>
                  <a href="#checklist" className="block hover:text-[#163A70]">
                    Pre-submission checklist
                  </a>
                  <a href="#faqs" className="block hover:text-[#163A70]">
                    FAQs
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  More Guides
                </h3>

                <div className="mt-5 space-y-5">
                  <Link
                    to="/scholarship-tips/how-to-write-winning-sop"
                    className="block border-b border-slate-100 pb-5 hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Application Documents
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Write a Winning Statement of Purpose
                    </p>
                  </Link>

                  <Link
                    to="/scholarship-tips/recommendation-letters"
                    className="block border-b border-slate-100 pb-5 hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Recommendation Letters
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Get Strong Recommendation Letters
                    </p>
                  </Link>

                  <Link
                    to="/scholarship-tips/scholarship-cv"
                    className="block border-b border-slate-100 pb-5 hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Application Documents
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Write a Winning Scholarship CV
                    </p>
                  </Link>

                  <Link
                    to="/scholarship-tips/interview-preparation"
                    className="block hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Interviews
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      Scholarship Interview Preparation Guide
                    </p>
                  </Link>
                </div>
              </div>

              <GoogleSidebarAd
                className="mx-auto max-w-[320px]"
              />
            </div>
          </aside>
        </div>
      </section>

      <section className="w-full bg-[#163A70] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center lg:px-8">
          <h3 className="font-serif text-4xl font-bold leading-tight">
            Found the scholarship to apply for?
          </h3>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/85">
            Browse research-focused scholarships, fellowships, and university-funded
            graduate programs organized by destination, degree level, and deadline.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/scholarship"
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
            >
              Browse Scholarships
            </Link>

            <Link
              to="/fellowship"
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
            >
              Browse Fellowships
            </Link>

            <Link
              to="/funded-graduate-admission"
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
            >
              University-Funded Programs
            </Link>

            <Link
              to="/student-sign-up"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                In This Guide
              </h3>

              <div className="mt-5 space-y-4">
                <a href="#what" className="block hover:text-[#163A70]">
                  What is a Research Proposal?
                </a>
                <a href="#structure" className="block hover:text-[#163A70]">
                  The six essential sections
                </a>
                <a href="#question" className="block hover:text-[#163A70]">
                  Choosing a strong research question
                </a>
                <a href="#methodology" className="block hover:text-[#163A70]">
                  Writing the methodology
                </a>
                <a href="#timeline" className="block hover:text-[#163A70]">
                  Timeline and work plan
                </a>
                <a href="#checklist" className="block hover:text-[#163A70]">
                  Pre-submission checklist
                </a>
              </div>
            </div>

            <div>
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

            <div className="md:text-right">
              <h2 className="font-serif text-3xl font-bold text-[#163A70]">
                Scholars<span className="text-amber-500">Knowledge</span>
              </h2>

              <p className="mt-4 leading-8 text-slate-600">
                Helping students discover verified scholarships, fellowships,
                funded graduate opportunities, and expert application guidance.
              </p>

              <div className="mt-6 flex flex-wrap justify-start gap-5 text-sm text-slate-500 md:justify-end">
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Use</Link>
                <Link to="/contact">Contact</Link>
              </div>

              <p className="mt-8 text-sm text-slate-500">
                © {new Date().getFullYear()} ScholarsKnowledge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
