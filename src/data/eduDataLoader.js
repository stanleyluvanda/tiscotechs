// src/data/eduDataLoader.js

import { CONTINENTS } from "./eduConstants.js";

const loadedData = new Map();
const pendingLoads = new Map();

const CONTINENT_LOADERS = {
  Africa: () =>
    import("./eduData.africa.js").then((module) => module.AFRICA),

  Asia: () =>
    import("./eduData.asia.js").then((module) => module.ASIA),

  Europe: () =>
    import("./eduData.europe.js").then((module) => module.EUROPE),

  LatinAmerica: () =>
    import("./eduData.latinamerica.js").then(
      (module) => module.LATIN_AMERICA
    ),

  NorthAmerica: () =>
    import("./eduData.northamerica.js").then(
      (module) => module.NORTH_AMERICA
    ),

  Oceania: () =>
    import("./eduData.oceania.js").then((module) => module.OCEANIA),
};

export function getContinents() {
  return [...CONTINENTS];
}

export async function loadContinentData(continent) {
  const key = String(continent || "").trim();

  if (!key || !CONTINENT_LOADERS[key]) {
    return [];
  }

  if (loadedData.has(key)) {
    return loadedData.get(key);
  }

  if (pendingLoads.has(key)) {
    return pendingLoads.get(key);
  }

  const request = CONTINENT_LOADERS[key]()
    .then((data) => {
      const normalized = Array.isArray(data) ? data : [];

      loadedData.set(key, normalized);
      pendingLoads.delete(key);

      return normalized;
    })
    .catch((error) => {
      pendingLoads.delete(key);
      throw error;
    });

  pendingLoads.set(key, request);

  return request;
}

export function getCountryObjectsFromData(data) {
  const list = Array.isArray(data) ? data : [];

  return list.map((country) => ({
    name: country?.name || "",
    code: country?.code || "",
    flag: flagEmoji(country?.code),
  }));
}

export function getCountriesWithFlagsFromData(data) {
  return getCountryObjectsFromData(data).map(
    ({ name, code, flag }) => ({
      label: `${flag} ${name}`,
      value: name,
      code,
      flag,
    })
  );
}

export function getUniversitiesFromData(data, countryName) {
  const country = findCountry(data, countryName);

  if (!country?.universities) {
    return [];
  }

  return Object.keys(country.universities);
}

export function getFacultiesFromData(
  data,
  countryName,
  university
) {
  const country = findCountry(data, countryName);
  const selectedUniversity =
    country?.universities?.[university];

  if (!selectedUniversity) {
    return [];
  }

  return Object.keys(selectedUniversity);
}

export function getProgramsFromData(
  data,
  countryName,
  university,
  faculty
) {
  const country = findCountry(data, countryName);

  const programs =
    country?.universities?.[university]?.[faculty]?.programs;

  return Array.isArray(programs) ? programs : [];
}

function findCountry(data, countryName) {
  if (!countryName) {
    return null;
  }

  const normalizedCountryName = String(countryName)
    .trim()
    .toLowerCase();

  const list = Array.isArray(data) ? data : [];

  return (
    list.find(
      (country) =>
        String(country?.name || "")
          .trim()
          .toLowerCase() === normalizedCountryName
    ) || null
  );
}

function flagEmoji(iso2 = "") {
  const code = String(iso2 || "").toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    return "🏳️";
  }

  const regionalIndicatorA = 0x1f1e6;

  return String.fromCodePoint(
    regionalIndicatorA + code.charCodeAt(0) - 65,
    regionalIndicatorA + code.charCodeAt(1) - 65
  );
}