// src/utils/fundingPrograms.js

import { FUNDING_PROGRAMS } from "../data/fundingPrograms";

export const fundingPrograms = FUNDING_PROGRAMS;

export const fundingProgramsById = Object.fromEntries(
  FUNDING_PROGRAMS.map((item) => [item.id, item])
);

export const featuredFundingPrograms = FUNDING_PROGRAMS.filter(
  (item) => item.featured
);

export const fundingTypes = [
  ...new Set(FUNDING_PROGRAMS.map((item) => item.type))
];

export const studyCountries = [
  ...new Set(
    FUNDING_PROGRAMS.flatMap((item) => item.studyCountries || [])
  )
].sort();