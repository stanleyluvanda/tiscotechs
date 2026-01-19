// src/pages/AdminMembers.jsx
import { useEffect, useMemo, useState } from "react";

/* ---------- storage helpers (kept as fallback) ---------- */
function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}

function getKey(u) {
  return u?.id || u?.uid || u?.userId || u?.email || u?.username || null;
}

function inferRole(u) {
  const r = (u.role || u.accountType || u.userType || "").toString().toLowerCase();
  if (r.includes("partner")) return "partner";
  if (r.includes("lect")) return "lecturer";
  if (r.includes("stud")) return "student";
  // heuristics
  if (u.program || u.year || u.studentId) return "student";
  if (u.staffId || u.faculty || u.department) return "lecturer";
  return "student";
}

function cryptoRandomId() {
  return "id_" + Math.random().toString(36).slice(2, 10);
}

function normalizeUser(u) {
  const id = u.id || u.uid || u.userId || u.email || u.username || cryptoRandomId();

  const name =
    u.name ||
    u.fullName ||
    `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
    u.username ||
    u.organization || // partners
    "—";

  const role = inferRole(u);

  const active = typeof u.active === "boolean" ? u.active : true;

  const createdAt =
    u.createdAt ||
    u.registeredAt ||
    u.created_on ||
    u.created ||
    new Date().toISOString();

  const continent =
    u.continent ||
    u.region ||
    u.geoContinent ||
    u?.location?.continent ||
    "—";

  const country =
    u.country ||
    u.nationality ||
    u.geoCountry ||
    u?.location?.country ||
    "—";

  const university =
    u.university ||
    u.school ||
    u.institution ||
    u?.education?.university ||
    // partners may not have university
    u.organization ||
    "—";

  const college =
    u.college || u.schoolUnit || u.faculty || u?.education?.college || "—";

  const department =
    u.department || u.dept || u?.education?.department || "—";

  const program =
    u.program || u.degreeProgram || u?.education?.program || "—";

  const year =
    u.year || u.yearOfStudy || u?.education?.year || "—";

  const gender =
    u.gender ||
    u.sex ||
    u.profileGender ||
    u?.personalInfo?.gender ||
    "—";

  return {
    id,
    name,
    email: u.email || "—",
    role,
    active,
    createdAt,
    continent,
    country,
    university,
    college,
    department,
    program,
    year,
    gender,
    raw: u,
  };
}

function readAllUsersFromStorageFallback() {
  const usersArr = safeParse(localStorage.getItem("users")) || [];
  const usersById = safeParse(localStorage.getItem("usersById")) || {};
  const currentUser =
    safeParse(localStorage.getItem("currentUser")) ||
    safeParse(sessionStorage.getItem("currentUser"));

  const map = new Map();

  Object.values(usersById).forEach((u) => {
    const key = getKey(u);
    if (key) map.set(key, u);
  });

  usersArr.forEach((u) => {
    if (!u) return;
    const key = getKey(u);
    if (!key) return;
    map.set(key, { ...(map.get(key) || {}), ...u });
  });

  if (currentUser) {
    const key = getKey(currentUser);
    if (key) map.set(key, { ...(map.get(key) || {}), ...currentUser });
  }

  return Array.from(map.values()).map(normalizeUser);
}

/* ---------- API helpers ---------- */
/*function apiBase() {
  return (
    import.meta.env.VITE_POSTS_API_BASE ||
    import.meta.env.VITE_CONTACTS_API_BASE ||
    "http://localhost:5003"
  ).replace(/\/+$/, "");
}*/

function apiBase() {
  return (
    import.meta.env.VITE_AUTH_API_BASE ||
    import.meta.env.VITE_POSTS_API_BASE ||
    import.meta.env.VITE_CONTACTS_API_BASE ||
    "https://izhwiz3a17.execute-api.us-east-1.amazonaws.com"
  ).replace(/\/+$/, "");
}



// Optional admin auth token (only if you already use it)
function getAdminAuthHeaders() {
  // If you don’t use tokens, this returns empty headers and still works.
  const token =
    sessionStorage.getItem("adminToken") ||
    localStorage.getItem("adminToken") ||
    "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchAllMembersFromServer() {
  const BASE = apiBase();

  // ✅ FIX: use the real DynamoDB-backed endpoint you just added and tested
  const r = await fetch(`${BASE}/api/admin/members`, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      ...getAdminAuthHeaders(),
    },
  });

  const j = await r.json().catch(() => null);
  if (!r.ok || !j || j.ok === false) {
    const msg = j?.error || `HTTP ${r.status}`;
    throw new Error(msg);
  }

  // ✅ supports both { users:[...] } or raw array (defensive)
  const users = Array.isArray(j?.users) ? j.users : Array.isArray(j) ? j : [];

  if (!Array.isArray(users)) return [];
  return users.map(normalizeUser);
}

/* ---------- write-back helpers (still local-only, safe) ---------- */
function writeUserBack(updated) {
  // This remains local-only. If you later add a server toggle endpoint,
  // you can wire it here without changing UI.
  const usersById = safeParse(localStorage.getItem("usersById")) || {};
  const idKey = updated.id || updated.email || updated.username;
  if (idKey && usersById[idKey]) {
    usersById[idKey] = { ...usersById[idKey], ...updated.raw, active: updated.active };
    localStorage.setItem("usersById", JSON.stringify(usersById));
  }

  const usersArr = safeParse(localStorage.getItem("users")) || [];
  const idx = usersArr.findIndex(
    (u) =>
      (u?.id || u?.uid || u?.userId || u?.email || u?.username) ===
      (updated.id || updated.email || updated.username)
  );
  if (idx >= 0) {
    usersArr[idx] = { ...usersArr[idx], ...updated.raw, active: updated.active };
    localStorage.setItem("users", JSON.stringify(usersArr));
  }

  const cur = safeParse(localStorage.getItem("currentUser"));
  if (cur && (cur.id === updated.id || cur.email === updated.email)) {
    localStorage.setItem("currentUser", JSON.stringify({ ...cur, active: updated.active }));
  }
}

/* ---------- UI ---------- */
export default function AdminMembers() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [tab, setTab] = useState("All"); // All | Students | Lecturers | Partners
  const [query, setQuery] = useState("");
  const [fContinent, setFContinent] = useState("All");
  const [fCountry, setFCountry] = useState("All");
  const [fUniversity, setFUniversity] = useState("All");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const remote = await fetchAllMembersFromServer();
      setRows(remote);
    } catch (e) {
      console.warn("[AdminMembers] remote fetch failed, falling back to localStorage:", e);
      setError("Could not load members from server. Showing local-only data (this device/browser) as fallback.");
      setRows(readAllUsersFromStorageFallback());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build option lists from data (dependent)
  const options = useMemo(() => {
    const allContinents = new Set();
    const allCountries = new Set();
    const allUniversities = new Set();

    rows.forEach((r) => {
      if (r.continent && r.continent !== "—") allContinents.add(r.continent);
      if (r.country && r.country !== "—") allCountries.add(r.country);
      if (r.university && r.university !== "—") allUniversities.add(r.university);
    });

    const countriesForContinent = new Set();
    const universitiesForCountry = new Set();

    rows.forEach((r) => {
      const continentPass = fContinent === "All" || r.continent === fContinent;
      if (continentPass && r.country && r.country !== "—") countriesForContinent.add(r.country);
    });

    rows.forEach((r) => {
      const continentPass = fContinent === "All" || r.continent === fContinent;
      const countryPass = fCountry === "All" || r.country === fCountry;
      if (continentPass && countryPass && r.university && r.university !== "—") {
        universitiesForCountry.add(r.university);
      }
    });

    return {
      continents: ["All", ...Array.from(allContinents).sort()],
      countries: ["All", ...Array.from((fContinent === "All" ? allCountries : countriesForContinent)).sort()],
      universities: ["All", ...Array.from((fCountry === "All"
        ? (fContinent === "All" ? allUniversities : universitiesForCountry)
        : universitiesForCountry)).sort()],
    };
  }, [rows, fContinent, fCountry]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const students = rows.filter((r) => r.role === "student").length;
    const lecturers = rows.filter((r) => r.role === "lecturer").length;
    const partners = rows.filter((r) => r.role === "partner").length;
    const active = rows.filter((r) => r.active).length;
    const inactive = total - active;
    return { total, students, lecturers, partners, active, inactive };
  }, [rows]);

  // Filtered list (role tab → location filters → search → sort)
  const filtered = useMemo(() => {
    let list = rows;

    if (tab === "Students") list = list.filter((r) => r.role === "student");
    if (tab === "Lecturers") list = list.filter((r) => r.role === "lecturer");
    if (tab === "Partners") list = list.filter((r) => r.role === "partner");

    if (fContinent !== "All") list = list.filter((r) => r.continent === fContinent);
    if (fCountry !== "All") list = list.filter((r) => r.country === fCountry);
    if (fUniversity !== "All") list = list.filter((r) => r.university === fUniversity);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.role || "").toLowerCase().includes(q) ||
        (r.continent || "").toLowerCase().includes(q) ||
        (r.country || "").toLowerCase().includes(q) ||
        (r.university || "").toLowerCase().includes(q) ||
        (r.program || "").toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rows, tab, fContinent, fCountry, fUniversity, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  useEffect(() => {
    setPage(1);
  }, [tab, fContinent, fCountry, fUniversity, query, pageSize]);

  function toggleActive(id) {
    setRows((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nu = { ...u, active: !u.active, raw: { ...u.raw, active: !u.active } };
          // local-only mirror; server toggle can be added later
          writeUserBack(nu);
          return nu;
        }
        return u;
      })
    );
  }

  function exportCSV() {
    const header = [
      "id", "name", "email", "role", "gender", "active", "createdAt",
      "continent", "country", "university", "college", "department", "program", "year",
    ];
    const body = filtered.map((u) => [
      safe(u.id), safe(u.name), safe(u.email), safe(u.role), safe(u.gender),
      u.active ? "true" : "false",
      new Date(u.createdAt).toISOString(),
      safe(u.continent), safe(u.country), safe(u.university),
      safe(u.college), safe(u.department), safe(u.program), safe(u.year),
    ]);
    const csv = [header, ...body].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function safe(v) { return v ?? ""; }
  function csvCell(v) {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-slate-600 mt-1">
            View and manage registered students, lecturers, and partners (server-backed).
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={load}
            className="border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50"
            title="Reload from server"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-4 text-sm text-slate-600">
          Loading members from server…
        </div>
      )}

      {!!error && (
        <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid md:grid-cols-6 gap-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="Students" value={stats.students} />
        <Stat label="Lecturers" value={stats.lecturers} />
        <Stat label="Partners" value={stats.partners} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Inactive" value={stats.inactive} />
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <Tabs value={tab} onChange={setTab} items={["All", "Students", "Lecturers", "Partners"]} />

        {/* Location filters */}
        <select
          value={fContinent}
          onChange={(e) => { setFContinent(e.target.value); setFCountry("All"); setFUniversity("All"); }}
          className="border border-slate-300 rounded-lg px-3 py-2"
          title="Filter by Continent"
        >
          {options.continents?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>

        <select
          value={fCountry}
          onChange={(e) => { setFCountry(e.target.value); setFUniversity("All"); }}
          className="border border-slate-300 rounded-lg px-3 py-2"
          title="Filter by Country"
        >
          {options.countries?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>

        <select
          value={fUniversity}
          onChange={(e) => setFUniversity(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2"
          title="Filter by University"
        >
          {options.universities?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>

        <div className="ml-auto flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, role…"
            className="border border-slate-300 rounded-lg px-3 py-2 w-64"
          />
          <button onClick={exportCSV} className="border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50">
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border border-slate-200 rounded-xl overflow-hidden">
          <thead className="bg-slate-50">
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Continent</Th>
              <Th>Country</Th>
              <Th>University/Org</Th>
              <Th>Gender</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && !loading && (
              <tr>
                <td colSpan="10" className="text-center py-8 text-slate-500">No members found.</td>
              </tr>
            )}
            {paged.map((u) => (
              <tr key={u.id} className="border-t">
                <Td className="font-medium">{u.name}</Td>
                <Td>{u.email}</Td>
                <Td className="capitalize">{u.role}</Td>
                <Td>{u.continent}</Td>
                <Td>{u.country}</Td>
                <Td>{u.university}</Td>
                <Td>{u.gender}</Td>
                <Td>
                  <span className={`px-2 py-1 rounded-full text-xs ${u.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </Td>
                <Td>{new Date(u.createdAt).toLocaleString()}</Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => alert(JSON.stringify(u.raw, null, 2))}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                    <button
                      onClick={() => toggleActive(u.id)}
                      className="text-slate-700 hover:underline"
                      title="Local-only toggle (server toggle can be added later)"
                    >
                      {u.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-slate-600">
          Showing <b>{paged.length}</b> of <b>{filtered.length}</b> members (page {pageSafe} / {totalPages})
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
            title="Rows per page"
          >
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
            className="border border-slate-300 rounded-lg px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe >= totalPages}
            className="border border-slate-300 rounded-lg px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4">
        This page now loads from <code>/api/admin/members</code> (server-backed). If the server is unreachable, it falls back to localStorage.
      </p>
    </div>
  );
}

/* ---------- little UI atoms ---------- */
function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
function Tabs({ items, value, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-slate-300 bg-white p-1">
      {items.map((it) => (
        <button
          key={it}
          onClick={() => onChange(it)}
          className={`px-3 py-1.5 rounded-full text-sm ${value === it ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`}
        >
          {it}
        </button>
      ))}
    </div>
  );
}
function Th({ children }) {
  return (
    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 text-sm text-slate-800 ${className}`}>{children}</td>;
}