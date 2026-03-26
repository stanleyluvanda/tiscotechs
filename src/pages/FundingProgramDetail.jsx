// src/pages/FundingProgramDetail.jsx

import { Link, useParams } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import {
  fundingProgramsById,
  fundingPrograms
} from "../utils/fundingPrograms";

function FulbrightExtraSections() {
  return (
    <>
      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Program Overview
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-slate-700">
          The Fulbright Foreign Student Program is one of the most respected
          international academic exchange programs in the world. Sponsored by
          the U.S. government, it gives graduate students, young professionals,
          and artists from more than 160 countries the opportunity to study,
          conduct research, and build academic or professional experience in the
          United States.
        </p>
        <p className="mt-3 text-[15px] leading-7 text-slate-700">
          Each year, approximately 4,000 international participants receive
          Fulbright support. The program is administered through binational
          Fulbright Commissions, Foundations, or U.S. Embassies, depending on
          the applicant’s country. Eligibility, deadlines, nomination
          procedures, and available award categories vary by country, so
          applicants must always review guidance from their local Fulbright
          office.
        </p>
      </section>

      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Types of Programs Under Fulbright
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">
              1. Graduate Degree Programs
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Fulbright supports Master’s and PhD study at accredited U.S.
              universities. These awards are intended for students pursuing
              advanced academic training in a broad range of fields.
            </p>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">
              2. Research Programs
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Some Fulbright awards support independent or supervised research
              in the United States. These may be degree-linked or non-degree,
              depending on the country and award category.
            </p>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">
              3. Non-Degree / Professional Programs
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              In some countries, Fulbright also supports non-degree academic,
              professional, or enrichment opportunities focused on leadership,
              capacity building, and specialized training.
            </p>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">
              4. Fulbright FLTA Program
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              The Foreign Language Teaching Assistant program is a special
              Fulbright track for early-career educators and language
              professionals who teach their native language at U.S. institutions
              while gaining academic and cultural experience.
            </p>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Fulbright Foreign Language Teaching Assistant (FLTA) Program
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-slate-700">
          The Fulbright FLTA Program is designed to strengthen language
          education and intercultural understanding in the United States. It
          places educators from more than 50 countries at U.S. colleges and
          universities, where they support the teaching of over 30 languages and
          share knowledge about their home cultures.
        </p>
        <p className="mt-3 text-[15px] leading-7 text-slate-700">
          This program is especially suitable for young teachers, English
          language educators, and early-career academic professionals with a
          strong interest in teaching language and culture in a U.S. campus
          environment.
        </p>

        <div className="mt-4 border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">
            Typical FLTA Eligibility
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700 list-disc pl-5">
            <li>Must reside in the country of nomination at application time.</li>
            <li>Must hold the equivalent of a U.S. bachelor’s degree.</li>
            <li>
              Master’s qualifications may strengthen competitiveness at some
              institutions.
            </li>
            <li>
              Should be an early-career teacher, teacher trainee, or educator in
              a related field.
            </li>
            <li>
              Must have strong English proficiency and demonstrate maturity,
              flexibility, and professionalism.
            </li>
            <li>
              Independent applications are not accepted; nomination must come
              through a Fulbright Commission or U.S. Embassy.
            </li>
          </ul>
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Placement Models
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="border border-slate-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-slate-900">
              IIE-Placement
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Under IIE-Placement, the Institute of International Education
              helps secure degree or non-degree opportunities for candidates.
              The placement team applies to institutions on behalf of nominees,
              manages admission decisions, negotiates funding where applicable,
              and coordinates final placement decisions.
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              This model is especially useful for applicants who want structured
              support with U.S. university placement.
            </p>
          </div>

          <div className="border border-slate-200 bg-emerald-50 p-4">
            <h3 className="font-semibold text-slate-900">
              Self-Placement
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Under Self-Placement, candidates apply directly to U.S.
              universities and manage all application requirements, deadlines,
              test scores, fees, and communication independently.
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              This model may suit students who already know which institutions
              they want to target and can manage the admissions process on their
              own.
            </p>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Award Benefits
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-slate-700">
          Fulbright awards are often fully funded or substantially funded,
          depending on the country and specific award type. Benefits commonly
          include:
        </p>

        <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700 list-disc pl-5">
          <li>J-1 visa sponsorship</li>
          <li>Funding support for study or research</li>
          <li>Health benefit plan</li>
          <li>Academic and professional enrichment activities</li>
          <li>Support through placement and program administration channels</li>
        </ul>
      </section>

      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Key Eligibility Notes
        </h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700 list-disc pl-5">
          <li>Applicants must usually apply from their country of nomination.</li>
          <li>
            A bachelor’s degree or equivalent is generally required before the
            program start date.
          </li>
          <li>
            English language proficiency is normally required through TOEFL,
            IELTS, or equivalent measures set by the country office.
          </li>
          <li>U.S. citizens and dual U.S. citizens are not eligible.</li>
          <li>
            Clinical fields such as medicine, dentistry, pharmacy, and some
            nursing pathways are generally not permitted under the Foreign
            Student Program, though some related non-clinical fields may be
            allowed.
          </li>
        </ul>
      </section>

      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          How to Apply
        </h2>
        <div className="mt-4 space-y-4">
          <div className="border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Step 1</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Contact your local Fulbright Commission, Foundation, or U.S.
              Embassy to confirm whether your country participates and which
              award types are available.
            </p>
          </div>

          <div className="border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Step 2</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Prepare the required documents, which often include academic
              records, references, personal statements, research or study plans,
              and language test scores.
            </p>
          </div>

          <div className="border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Step 3</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Submit your application through the official local Fulbright
              channel before the country-specific deadline.
            </p>
          </div>

          <div className="border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Step 4</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              If selected, follow the placement pathway used by your country,
              whether through IIE-Placement or self-placement.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm leading-7 text-slate-800">
        {Array.isArray(value) ? value.join(", ") : value}
      </div>
    </div>
  );
}

export default function FundingProgramDetail() {
  const { id } = useParams();
  const program = fundingProgramsById[id];

  if (!program) {
    return <div className="p-6">Not found</div>;
  }

  const related = fundingPrograms
    .filter((item) => item.id !== id)
    .slice(0, 4);

  const isFulbright = program.id === "fulbright-foreign-student-program";

  return (
    <>
      <div className="bg-[#f7f8fb]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <section className="border border-slate-200 bg-white shadow-sm">
            {program.bannerUrl ? (
              <div className="overflow-hidden border-b border-slate-200 bg-slate-100">
                <img
                  src={program.bannerUrl}
                  alt={program.title}
                  className="h-[220px] sm:h-[300px] w-full object-cover"
                />
              </div>
            ) : null}

            <div className="p-5 sm:p-6">
              <div className="inline-flex items-center rounded-full bg-[#0A4595] px-3 py-1 text-xs font-semibold text-white">
                Funding Program
              </div>

              <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900">
                {program.title}
              </h1>

              <p className="mt-2 text-sm font-medium text-slate-500">
                {program.provider}
              </p>

              <p className="mt-4 text-[15px] leading-7 text-slate-700">
                {program.summary}
              </p>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Funding Type" value={program.fundingType} />
            <DetailRow label="Amount / Coverage" value={program.amount} />
            <DetailRow label="Study Countries" value={program.studyCountries} />
            <DetailRow label="Study Level" value={program.studyLevel} />
          </section>

          <section className="mt-6 grid gap-6">
            {!isFulbright ? (
              <>
                <section className="border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">
                    Description
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">
                    {program.description}
                  </p>
                </section>

                <section className="border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">
                    Eligibility
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">
                    {program.eligibility}
                  </p>
                </section>

                <section className="border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">
                    Funding
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">
                    {program.funding}
                  </p>
                </section>

                <section className="border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">
                    Application Process
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">
                    {program.applicationProcess}
                  </p>
                </section>
              </>
            ) : (
              <FulbrightExtraSections />
            )}
          </section>

          <section className="mt-6 border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Additional Information
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailRow label="Eligible Countries" value={program.eligibleCountries} />
              <DetailRow label="Fields of Study" value={program.fields} />
              <DetailRow label="Category" value={program.category} />
              <DetailRow label="Recurring Program" value={program.isRecurring ? "Yes" : "No"} />
            </div>

            {program.officialUrl ? (
              <div className="mt-5">
                <a
                  href={program.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center border border-[#0A4595] px-4 py-2 text-sm font-semibold text-[#0A4595] hover:bg-[#0A4595] hover:text-white transition"
                >
                  Visit Official Website
                </a>
              </div>
            ) : null}
          </section>

          <section className="mt-6 border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-base font-bold text-amber-900">
              Disclaimer
            </h2>
            <p className="mt-2 text-sm leading-7 text-amber-900/90">
              Funding information is provided for general guidance only.
              Eligibility, deadlines, study levels, award benefits, placement
              arrangements, and application procedures may change. Applicants
              should always verify the latest requirements directly from the
              official provider website or the relevant country office before
              applying.
            </p>
          </section>

          <section className="mt-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Related Programs
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/funding-programs/${item.id}`}
                  className="border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="text-lg font-semibold text-slate-900">
                    {item.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {item.provider}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </>
  );
}