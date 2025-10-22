// src/data/eduData.js
import { AFRICA } from "./eduData.africa.js";
import { ASIA } from "./eduData.asia.js";
import { EUROPE } from "./eduData.europe.js";
import { LATIN_AMERICA } from "./eduData.latinamerica.js";
import { NORTH_AMERICA } from "./eduData.northamerica.js";
import { OCEANIA } from "./eduData.oceania.js";

/** Master map: continent -> array of { name, code, universities? } */
export const EDU = {
  Africa: AFRICA,
  Asia: ASIA,
  Europe: EUROPE,
  LatinAmerica: LATIN_AMERICA,
  NorthAmerica: NORTH_AMERICA,
  Oceania: OCEANIA,
};

// Utility: ISO2 -> flag emoji (no external libs)
const flagEmoji = (iso2 = "") => {
  const code = String(iso2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  const A = 0x1F1E6;
  return String.fromCodePoint(A + (code.charCodeAt(0) - 65), A + (code.charCodeAt(1) - 65));
};

// Public helpers expected by your pages
export const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Graduate"];

export function getContinents() {
  return Object.keys(EDU);
}

export function getCountries(continent) {
  const list = EDU[continent] || [];
  return list.map(c => c.name);
}

export function getCountryObjects(continent) {
  const list = EDU[continent] || [];
  return list.map(c => ({ name: c.name, code: c.code, flag: flagEmoji(c.code) }));
}

function findCountry(continent, countryName) {
  if (!continent || !countryName) return null;
  const list = EDU[continent] || [];
  const name = String(countryName).trim().toLowerCase();
  return list.find(c => c.name.trim().toLowerCase() === name) || null;
}

export function getUniversities(continent, countryName) {
  const c = findCountry(continent, countryName);
  if (!c || !c.universities) return [];
  return Object.keys(c.universities);
}

export function getFaculties(continent, countryName, university) {
  const c = findCountry(continent, countryName);
  if (!c || !c.universities) return [];
  const u = c.universities[university];
  if (!u) return [];
  return Object.keys(u);
}

export function getPrograms(continent, countryName, university, faculty) {
  const c = findCountry(continent, countryName);
  const u = c?.universities?.[university];
  const f = u?.[faculty];
  const programs = Array.isArray(f?.programs) ? f.programs : [];
  return programs;
}

// Extra exports if you want flags in selects
export function getCountriesWithFlags(continent) {
  return getCountryObjects(continent).map(({ name, code, flag }) => ({
    label: `${flag} ${name}`,
    value: name,
    code,
    flag,
  }));
}