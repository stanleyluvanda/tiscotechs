const API_BASE =
  import.meta.env.VITE_UNIVERSITY_FUNDING_API_BASE ||
  "https://hb6drzv30m.execute-api.us-east-1.amazonaws.com";

async function parseJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON response (${res.status})`);
  }
}

export async function getUniversityFunding(countrySlug, universitySlug) {
  const res = await fetch(
    `${API_BASE}/api/university-fees-aid/${encodeURIComponent(countrySlug)}/${encodeURIComponent(universitySlug)}`
  );

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to load university funding page");
  }

  return data;
}

export async function listUniversityFundingByCountry(countrySlug) {
  const res = await fetch(
    `${API_BASE}/api/university-fees-aid/${encodeURIComponent(countrySlug)}`
  );

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to load university funding list");
  }

  return data?.items || [];
}

export async function saveUniversityFunding(payload) {
  const res = await fetch(`${API_BASE}/api/admin/university-fees-aid/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to save university funding");
  }

  return data?.item || data;
}