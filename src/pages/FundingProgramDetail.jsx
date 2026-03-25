// src/pages/FundingProgramDetail.jsx

import { useParams } from "react-router-dom";
import {
  fundingProgramsById,
  fundingPrograms
} from "../utils/fundingPrograms";

export default function FundingProgramDetail() {
  const { id } = useParams();
  const program = fundingProgramsById[id];

  if (!program) {
    return <div className="p-6">Not found</div>;
  }

  const related = fundingPrograms
    .filter((item) => item.id !== id)
    .slice(0, 4);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">
        {program.title}
      </h1>

      <p className="text-sm text-gray-600 mb-4">
        {program.provider}
      </p>

      {/* Summary */}
      <p className="mb-4">{program.summary}</p>

      {/* Description */}
      <section className="mb-4">
        <h2 className="font-semibold">Description</h2>
        <p>{program.description}</p>
      </section>

      {/* Eligibility */}
      <section className="mb-4">
        <h2 className="font-semibold">Eligibility</h2>
        <p>{program.eligibility}</p>
      </section>

      {/* Funding */}
      <section className="mb-4">
        <h2 className="font-semibold">Funding</h2>
        <p>{program.funding}</p>
      </section>

      {/* Application */}
      <section className="mb-4">
        <h2 className="font-semibold">
          Application Process
        </h2>
        <p>{program.applicationProcess}</p>
      </section>

      {/* Link */}
      <a
        href={program.officialUrl}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline"
      >
        Official Website
      </a>

      {/* Related */}
      <div className="mt-8">
        <h3 className="font-semibold mb-2">
          Related Programs
        </h3>

        <div className="grid md:grid-cols-2 gap-3">
          {related.map((item) => (
            <a
              key={item.id}
              href={`/funding-programs/${item.id}`}
              className="border p-2 rounded"
            >
              {item.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}