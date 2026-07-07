//ScholarshipTipsRecommendations.jsx//
/*import { useEffect } from "react";*/
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd";

export default function ScholarshipTipsRecommendationLetters() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="text-sm text-slate-500">
          <Link to="/home" className="hover:text-blue-900">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/scholarship-tips" className="hover:text-blue-900">Scholarship Tips</Link>
          <span className="mx-2">›</span>
          <span>Recommendation Letters</span>
        </div>

        <div className="mt-10 w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-800">
          Letters & References
        </div>

        <h1 className="mt-8 max-w-4xl font-serif text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
          How to Get Strong Recommendation Letters
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
          A weak recommendation letter can sink an otherwise strong scholarship,
          Master&apos;s, or PhD application. Learn who to ask, how to brief them,
          and what makes a letter convincing to admission and funding committees.
        </p>

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

            <div className="ml-4">
              <p className="font-bold text-slate-950">
                ScholarsKnowledge Editorial
              </p>

              <p className="text-sm text-slate-500">
                Updated June 2026 · Applies to Master&apos;s, PhD & scholarship applications
              </p>
            </div>
          </div>

          <span className="whitespace-nowrap rounded-full bg-[#163A70] px-4 py-2 text-sm font-bold text-white">
            15 min read
          </span>
        </div>

        <div className="mt-8 mb-2 flex items-start gap-8">
          <div className="max-w-[720px] flex-1">
            <img
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80"
              alt="Professor reviewing student documents to write a recommendation letter"
              className="h-[280px] w-full rounded-2xl object-cover shadow-sm md:h-[380px]"
            />
          </div>

          <div className="hidden w-[320px] shrink-0 xl:block">
            <GoogleSidebarAd />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="max-w-3xl">
            <section id="why" className="mt-6">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Why recommendation letters matter so much
              </h2>

              <p className="mt-6 font-serif text-2xl leading-10 text-slate-800 first-letter:float-left first-letter:mr-4 first-letter:font-serif first-letter:text-8xl first-letter:font-bold first-letter:leading-[0.85] first-letter:text-[#163A70]">
                Most scholarship applicants spend most of their preparation time
                on the personal statement and very little time on recommendation
                letters. This is a serious mistake. For competitive scholarships,
                Master&apos;s programs, and PhD admission, a recommendation letter
                carries major weight because it is where someone else confirms
                your academic ability, character, discipline, and future potential.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Your transcript shows what grades you earned. Your CV shows what
                activities, jobs, awards, and research experiences you have completed.
                Your statement of purpose explains your goals in your own words.
                But a recommendation letter gives the committee an outside view of
                how you actually work, how you think, how you respond to challenges,
                and whether respected people who know you believe you are ready for
                advanced study.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                For graduate school, this outside view is especially important.
                A Master&apos;s or PhD program is not only asking whether you passed
                classes. The committee wants to know whether you can handle difficult
                readings, independent research, long-term projects, academic feedback,
                teamwork, and professional responsibility. A strong recommender can
                explain these qualities with real examples that your grades alone
                cannot show.
              </p>

              <div className="mt-8 rounded-r-xl border border-blue-100 border-l-4 border-l-[#163A70] bg-blue-50 p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#163A70]">
                  Key insight
                </h3>
                <p className="mt-3 text-base leading-8 text-[#163A70]">
                  A committee reading “she is one of the best students I have
                  taught” learns almost nothing unless the writer explains why.
                  A committee reading a specific moment when you solved a real
                  academic, research, or professional problem is more likely to
                  remember that letter.
                </p>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="graduate">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Graduate recommendation letters are different
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Recommendation letters for undergraduate admission often focus on
                classroom behavior, school involvement, leadership, and personal
                character. These qualities still matter, but graduate programs look
                for something more specific. They want evidence that you are ready
                for advanced academic work and, in many cases, independent research.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                For a Master&apos;s application, a strong letter may discuss your
                analytical ability, writing, quantitative skills, maturity, professional
                judgment, or ability to apply classroom knowledge to real problems.
                For a PhD application, the letter should go further. It should help
                the committee understand your research potential, intellectual curiosity,
                persistence, originality, and ability to contribute to a department or
                research group over several years.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                This is why the best letters for graduate study are not generic
                character references. They are focused academic or professional
                endorsements. They explain what you have already done, how you performed
                compared with peers, what kind of thinker you are, and why your future
                goals are realistic.
              </p>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-bold text-slate-950">
                  What graduate committees want to learn
                </h3>

                <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                  <li>Can this applicant handle advanced coursework?</li>
                  <li>Does this applicant show research or analytical potential?</li>
                  <li>Does this applicant work independently and meet deadlines?</li>
                  <li>How does this applicant respond to feedback and difficulty?</li>
                  <li>Will this applicant contribute positively to the academic community?</li>
                </ul>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="choose">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Step 1 — Choose the right recommenders
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                The strongest recommender is not always the most famous person
                you know. Choose someone who has worked closely with you and can
                speak with evidence about your academic ability, leadership,
                discipline, judgment, and potential. A detailed letter from a
                lecturer, supervisor, or research mentor who knows your work well
                is usually stronger than a vague letter from a senior person who
                barely remembers you.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                For graduate school, at least one letter should normally come from
                an academic source, such as a professor, lecturer, thesis supervisor,
                academic advisor, or research mentor. This person can comment on
                your ability to learn at an advanced level. A second or third letter
                may come from a professional supervisor, internship manager, project
                lead, or employer if that person can speak to relevant skills such as
                research, analysis, leadership, communication, or public service.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                  <h4 className="font-bold text-emerald-800">✓ Strong choices</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>Professor who supervised your thesis or research project</li>
                    <li>Supervisor from a relevant internship or professional role</li>
                    <li>Lecturer from a course central to your graduate interests</li>
                    <li>Manager who can speak to leadership, judgment, and impact</li>
                    <li>Research advisor who has seen your independence and persistence</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                  <h4 className="font-bold text-red-800">✗ Avoid these</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>Famous names with no direct knowledge of your work</li>
                    <li>Family members or close family friends</li>
                    <li>Professors from large lectures who barely know you</li>
                    <li>Anyone who seems reluctant or too busy to write carefully</li>
                    <li>People who can only repeat your CV without adding insight</li>
                  </ul>
                </div>
              </div>

              <p className="mt-8 text-lg leading-9 text-slate-700">
                When deciding whom to ask, do not only ask, “Who has the highest
                title?” Ask, “Who can write the most specific letter?” A strong
                recommender should be able to describe how long they have known you,
                in what capacity, what work they observed, what strengths they saw,
                and why those strengths matter for the program or scholarship.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="academic-professional">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Academic vs professional references
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Many graduate applicants worry that all letters must come from
                professors. For research-heavy programs, academic letters are usually
                very important. However, professional letters can also be powerful
                when they are relevant to the program. This is especially true for
                applicants applying to professional Master&apos;s degrees, public policy,
                education, public health, business, development studies, data science,
                economics, engineering management, and other applied fields.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                An academic recommender is best positioned to discuss your coursework,
                research writing, class participation, thesis, lab work, analytical
                thinking, and readiness for graduate-level study. A professional
                recommender is best positioned to discuss your reliability, leadership,
                initiative, communication, teamwork, problem-solving, and practical
                impact. The best combination depends on the program.
              </p>

              <div className="mt-8 rounded-r-2xl border border-amber-200 border-l-[6px] border-l-amber-500 bg-amber-50 p-6">
                <h4 className="font-bold text-amber-900">
                  Practical rule
                </h4>

                <p className="mt-3 leading-8 text-amber-950">
                  For a PhD application, prioritize academic and research letters.
                  For a professional Master&apos;s program, use a balanced combination
                  of academic and professional letters if the university allows it.
                  For scholarships, choose recommenders who can connect your ability,
                  character, leadership, and future goals to the mission of the award.
                </p>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="ask">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Step 2 — Ask early and ask properly
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Ask at least six to eight weeks before the deadline. When you
                ask, make it easy for the recommender to write a specific,
                evidence-based letter. Good letters take time because the writer
                must think carefully, review your materials, and connect their
                observations to the opportunity you are pursuing.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                If possible, ask in person or through a short meeting first. Explain
                what you are applying for, why you are applying, and why you believe
                they are the right person to support your application. If an in-person
                meeting is not possible, write a clear, respectful email. Give the
                recommender room to decline. A reluctant letter is rarely helpful.
              </p>

              <div className="mt-8 rounded-r-2xl border border-blue-200 border-l-[6px] border-l-[#163A70] bg-blue-50 p-6">
                <h4 className="font-bold text-[#163A70]">
                  What to send your recommender
                </h4>

                <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                  <li>A short note explaining the scholarship or graduate program</li>
                  <li>The program criteria, funding mission, or department focus</li>
                  <li>Your draft Statement of Purpose or research proposal</li>
                  <li>Your CV, transcript, and list of relevant achievements</li>
                  <li>Three to five specific experiences you shared with them</li>
                  <li>The submission deadline, portal link, and format requirements</li>
                </ul>
              </div>

              <p className="mt-8 text-lg leading-9 text-slate-700">
                Do not assume your recommender remembers every detail about you.
                Even a professor who respects you may have taught hundreds of students.
                Your job is not to write the letter for them, but to provide the
                context that helps them write accurately and specifically.
              </p>
            </section>

            <GoogleSidebarAd
              className="mx-auto my-10 max-w-[720px]"
            />

            <section id="brief">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Step 3 — Brief them on what to emphasize
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                This can feel uncomfortable, but recommenders expect it. Tell
                your recommender which parts of your work are most relevant to
                the scholarship or graduate program. If the scholarship values
                leadership, remind them of a real moment where you demonstrated
                leadership. If the program values research, point them to your
                strongest research work.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A useful briefing note should be short, organized, and honest.
                Include the title of the opportunity, your intended degree or field,
                your long-term goals, and the experiences you hope the recommender
                may consider mentioning. You can also include a few bullet points
                about your growth, such as how your writing improved, how you handled
                a difficult project, or how your research interests developed.
              </p>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-950">
                  Strong briefing examples
                </h3>

                <div className="mt-5 space-y-5 text-base leading-8 text-slate-700">
                  <p>
                    “In your development economics course, my final paper examined
                    mobile banking adoption among low-income households. Since I am
                    applying for a Master&apos;s in Economics with a focus on financial
                    inclusion, that project may be useful to mention.”
                  </p>

                  <p>
                    “During my internship, I prepared weekly data summaries for the
                    project team and helped identify errors in the reporting process.
                    Since the scholarship values public-sector impact, this experience
                    may connect well to my goals.”
                  </p>

                  <p>
                    “For my PhD application, I hope the committee can understand my
                    research potential, especially my ability to work independently,
                    revise after feedback, and develop a clear research question.”
                  </p>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="strong-letter">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                What makes a recommendation letter strong
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A strong recommendation letter does more than praise you. It gives
                evidence. It helps the reader see you in action. The best letters
                describe your relationship with the recommender, explain what the
                recommender observed, and connect those observations to the program
                or scholarship.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A weak letter says the applicant is hardworking, intelligent, and
                motivated. A strong letter shows those qualities through examples:
                a research paper you revised several times, a data project you
                completed under pressure, a class discussion where you asked original
                questions, or a professional task where your judgment improved an
                outcome.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                  <h4 className="font-bold text-slate-950">
                    Weak letter language
                  </h4>
                  <p className="mt-4 leading-8 text-slate-700">
                    “He is a very good student who works hard and has strong
                    potential.”
                  </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                  <h4 className="font-bold text-[#163A70]">
                    Stronger letter language
                  </h4>
                  <p className="mt-4 leading-8 text-slate-700">
                    “In his final research project, he moved from a broad topic to
                    a clear empirical question, revised his model after feedback,
                    and produced one of the strongest policy analyses in the class.”
                  </p>
                </div>
              </div>

              <p className="mt-8 text-lg leading-9 text-slate-700">
                Specificity creates credibility. Committees read many letters that
                sound positive but empty. The letter that stands out is the one that
                helps them understand what kind of student, researcher, colleague,
                or future professional you are likely to become.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="research">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                For PhD applicants: show research potential
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                PhD recommendation letters should help the committee evaluate whether
                you can succeed in a long research journey. Grades matter, but doctoral
                study also requires patience, independence, curiosity, writing ability,
                and the discipline to keep working when answers are not obvious.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A strong PhD letter may discuss your thesis, research assistantship,
                seminar paper, laboratory work, fieldwork, coding project, data analysis,
                or independent reading. It should help the committee understand how you
                think as a developing scholar. The writer can explain whether you ask
                meaningful questions, understand literature, handle evidence carefully,
                revise your work, and show readiness for sustained academic training.
              </p>

              <div className="mt-8 rounded-r-2xl border border-emerald-200 border-l-[6px] border-l-emerald-600 bg-emerald-50 p-6">
                <h4 className="font-bold text-emerald-900">
                  For doctoral applications
                </h4>

                <p className="mt-3 leading-8 text-emerald-950">
                  Ask recommenders who can speak about your research behavior, not
                  only your classroom performance. A PhD committee wants to know how
                  you work when there is no simple answer, no fixed textbook solution,
                  and no immediate reward.
                </p>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="average-grades">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Can a strong letter help if your grades are not perfect?
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Yes, but it must be specific. A recommendation letter cannot erase a
                weak academic record, but it can give context. If one semester was
                affected by illness, family responsibility, financial pressure, or
                another serious challenge, a recommender who knows the situation may
                help the committee interpret your record more fairly.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                More importantly, a strong letter can show growth. If your earlier
                grades were average but your later work became stronger, a professor
                can explain that improvement. If your transcript does not fully reflect
                your research ability, a supervisor can describe the quality of your
                independent work. Committees often care about direction, maturity, and
                readiness, not only past numbers.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                However, the letter should remain honest. A recommendation that tries
                to hide obvious weaknesses may sound unrealistic. A better approach is
                to acknowledge growth carefully and then provide evidence that the
                applicant is now prepared for the demands of the program.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="mistakes">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Common mistakes applicants make
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Many applicants weaken their recommendation letters before the writer
                even starts. The most common mistake is asking too late. A rushed
                recommender may submit a short, generic letter simply because there
                is no time to do more. Another mistake is choosing someone because of
                title instead of relationship. Committees are rarely impressed by a
                famous name if the letter says nothing personal.
              </p>

              <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
                <h4 className="font-bold text-red-800">
                  Avoid these mistakes
                </h4>

                <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                  <li>Asking only a few days before the deadline</li>
                  <li>Sending no CV, statement, transcript, or program details</li>
                  <li>Choosing a prestigious person who barely knows you</li>
                  <li>Assuming the same letter fits every scholarship or program</li>
                  <li>Forgetting to confirm submission instructions</li>
                  <li>Failing to thank the recommender after submission</li>
                </ul>
              </div>

              <p className="mt-8 text-lg leading-9 text-slate-700">
                The recommendation process is also a test of professionalism. A
                student who communicates clearly, provides documents early, and follows
                up respectfully makes the recommender&apos;s work easier. That often
                leads to a stronger letter.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="sample-request">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Sample request message
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Your request should be respectful, clear, and easy to answer. Do not
                pressure the person. Give them the option to decline if they cannot
                write a strong letter before the deadline.
              </p>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="leading-8 text-slate-800">
                  Dear Professor [Name],
                </p>

                <p className="mt-4 leading-8 text-slate-800">
                  I hope you are doing well. I am applying for [program/scholarship
                  name], and I wanted to ask whether you would feel comfortable writing
                  a strong recommendation letter for me. I am asking because your
                  course/project/thesis supervision helped shape my interest in
                  [field], and you observed my work on [specific project or experience].
                </p>

                <p className="mt-4 leading-8 text-slate-800">
                  The deadline is [date], and the letter will be submitted through
                  [portal/email/system]. I can send my CV, transcript, draft statement
                  of purpose, program details, and a short summary of the work I
                  completed with you.
                </p>

                <p className="mt-4 leading-8 text-slate-800">
                  I completely understand if your schedule does not allow you to write
                  one at this time. Thank you for considering my request.
                </p>

                <p className="mt-4 leading-8 text-slate-800">
                  Sincerely,
                  <br />
                  [Your Name]
                </p>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="followup">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Follow up with appreciation
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Send a polite reminder one to two weeks before the deadline. One
                follow-up is appropriate. Two is acceptable if the deadline is close
                and the system still shows the letter as missing. Keep the tone calm,
                respectful, and practical. Recommenders are often supporting many
                students at the same time.
              </p>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                After submission, send a genuine thank-you message. If you later
                receive admission, funding, or an interview invitation, update them.
                Recommenders often appreciate knowing the result, and maintaining
                that relationship matters. The same professor or supervisor may later
                support you for fellowships, assistantships, internships, PhD programs,
                or job applications.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="faq">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Recommendation letter FAQs
              </h2>

              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-bold text-slate-950">
                    How many recommendation letters do I need?
                  </h3>
                  <p className="mt-3 leading-8 text-slate-700">
                    Most graduate programs and scholarships ask for two or three.
                    Always check each program&apos;s instructions. Do not send extra
                    letters unless the application allows them and the extra letter
                    adds a new perspective.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-bold text-slate-950">
                    Should I choose a professor or an employer?
                  </h3>
                  <p className="mt-3 leading-8 text-slate-700">
                    For PhD programs, academic and research letters are usually most
                    important. For professional Master&apos;s programs and scholarships,
                    a combination of academic and professional letters can work well
                    if each recommender speaks to relevant strengths.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-bold text-slate-950">
                    Is a famous recommender better?
                  </h3>
                  <p className="mt-3 leading-8 text-slate-700">
                    Not if the letter is generic. A less famous recommender who knows
                    your work deeply is usually more valuable than a senior person who
                    can only write a few general sentences.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-bold text-slate-950">
                    Can I reuse the same recommender for many applications?
                  </h3>
                  <p className="mt-3 leading-8 text-slate-700">
                    Yes, but tell the recommender clearly how many letters are needed,
                    which deadlines apply, and whether each program requires a separate
                    upload. Do not assume one request covers every application.
                  </p>
                </div>
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
                  <a href="#why" className="block hover:text-[#163A70]">Why letters matter</a>
                  <a href="#graduate" className="block hover:text-[#163A70]">Graduate letters</a>
                  <a href="#choose" className="block hover:text-[#163A70]">Choose recommenders</a>
                  <a href="#academic-professional" className="block hover:text-[#163A70]">Academic vs professional</a>
                  <a href="#ask" className="block hover:text-[#163A70]">Ask properly</a>
                  <a href="#brief" className="block hover:text-[#163A70]">Brief them</a>
                  <a href="#strong-letter" className="block hover:text-[#163A70]">Strong letters</a>
                  <a href="#research" className="block hover:text-[#163A70]">PhD research potential</a>
                  <a href="#mistakes" className="block hover:text-[#163A70]">Common mistakes</a>
                  <a href="#faq" className="block hover:text-[#163A70]">FAQs</a>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  More Guides
                </h3>

                <div className="mt-5 space-y-5">
                  <Link to="/scholarship-tips/how-to-write-winning-sop" className="block border-b border-slate-100 pb-5 hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Application Documents
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Write a Winning Statement of Purpose
                    </p>
                  </Link>

                  <Link to="/scholarship-tips/research-proposal" className="block border-b border-slate-100 pb-5 hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Research Writing
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Write a Research Proposal
                    </p>
                  </Link>

                  <Link to="/scholarship-tips/scholarship-cv" className="block border-b border-slate-100 pb-5 hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Application Documents
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Write a Winning Scholarship CV
                    </p>
                  </Link>

                  <Link to="/scholarship-tips/motivation-letter-vs-sop" className="block border-b border-slate-100 pb-5 hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Application Documents
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      Motivation Letter vs Statement of Purpose — What&apos;s the Difference?
                    </p>
                  </Link>

                  <Link to="/scholarship-tips/recommendation-letters" className="block border-b border-slate-100 pb-5 hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Recommendation Letters
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Get Strong Recommendation Letters
                    </p>
                  </Link>

                  <Link to="/scholarship-tips/interview-preparation" className="block hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Interviews
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      Scholarship Interview Preparation Guide
                    </p>
                  </Link>
                </div>
              </div>

              <GoogleSidebarAd className="mx-auto max-w-[320px]" />
            </div>
          </aside>
        </div>
      </section>

      <section className="w-full bg-[#163A70] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center lg:px-8">
          <h3 className="font-serif text-4xl font-bold leading-tight">
            Find the right scholarship to apply for
          </h3>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/85">
            Browse verified, fully funded scholarships organized by country,
            level of study, and deadline.
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
                <a href="#why" className="block hover:text-[#163A70]">
                  Why recommendation letters matter
                </a>
                <a href="#graduate" className="block hover:text-[#163A70]">
                  Graduate recommendation letters
                </a>
                <a href="#choose" className="block hover:text-[#163A70]">
                  Choose the right recommenders
                </a>
                <a href="#ask" className="block hover:text-[#163A70]">
                  Ask early and ask properly
                </a>
                <a href="#brief" className="block hover:text-[#163A70]">
                  Brief your recommender
                </a>
                <a href="#mistakes" className="block hover:text-[#163A70]">
                  Common mistakes
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
                © {new Date().getFullYear()} ScholarsKnowledge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}