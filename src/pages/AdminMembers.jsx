// src/pages/AdminMembers.jsx
import { useEffect, useMemo, useState } from "react";

/* ---------- storage helpers (aligned with your App.jsx approach) ---------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }

function readAllUsersFromStorage() {
  const usersArr = safeParse(localStorage.getItem("users")) || [];
  const usersById = safeParse(localStorage.getItem("usersById")) || {};
  const currentUser =
    safeParse(localStorage.getItem("currentUser")) ||
    safeParse(sessionStorage.getItem("currentUser"));

  const map = new Map();

  // Merge byId
  Object.values(usersById).forEach(u => {
    const key = getKey(u);
    if (key) map.set(key, u);
  });

  // Merge array
  usersArr.forEach(u => {
    if (!u) return;
    const key = getKey(u);
    if (!key) return;
    map.set(key, { ...(map.get(key) || {}), ...u });
  });

  // Include current user if present
  if (currentUser) {
    const key = getKey(currentUser);
    if (key) map.set(key, { ...(map.get(key) || {}), ...currentUser });
  }

  // Normalize for table usage
  return Array.from(map.values()).map(normalizeUser);
}

function getKey(u) {
  return u?.id || u?.uid || u?.userId || u?.email || u?.username || null;
}

function normalizeUser(u) {
  const id = u.id || u.uid || u.userId || u.email || u.username || cryptoRandomId();

  // Names
  const name =
    u.name ||
    u.fullName ||
    `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
    u.username ||
    "—";

  // Role
  const role = inferRole(u);

  // Status
  const active = typeof u.active === "boolean" ? u.active : true;

  // Timestamps
  const createdAt = u.createdAt || u.registeredAt || u.created_on || u.created || new Date().toISOString();

  // Hierarchy (support multiple key names you’ve used)
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
    "—";

  const college =
    u.college || u.schoolUnit || u.faculty || u?.education?.college || "—";

  const department =
    u.department || u.dept || u?.education?.department || "—";

  const program =
    u.program || u.degreeProgram || u?.education?.program || "—";

  const year =
    u.year || u.yearOfStudy || u?.education?.year || "—";

  // Gender (new)
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
    gender, // ← added
    raw: u,
  };
}

function inferRole(u) {
  const r = (u.role || u.accountType || u.userType || "").toString().toLowerCase();
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

/* ---------- write-back helpers ---------- */
function writeUserBack(updated) {
  // usersById
  const usersById = safeParse(localStorage.getItem("usersById")) || {};
  const idKey = updated.id || updated.email || updated.username;
  if (idKey && usersById[idKey]) {
    usersById[idKey] = { ...usersById[idKey], ...updated.raw, active: updated.active };
    localStorage.setItem("usersById", JSON.stringify(usersById));
  }

  // users array
  const usersArr = safeParse(localStorage.getItem("users")) || [];
  const idx = usersArr.findIndex(u =>
    (u?.id || u?.uid || u?.userId || u?.email || u?.username) ===
    (updated.id || updated.email || updated.username)
  );
  if (idx >= 0) {
    usersArr[idx] = { ...usersArr[idx], ...updated.raw, active: updated.active };
    localStorage.setItem("users", JSON.stringify(usersArr));
  }

  // currentUser
  const cur = safeParse(localStorage.getItem("currentUser"));
  if (cur && (cur.id === updated.id || cur.email === updated.email)) {
    localStorage.setItem("currentUser", JSON.stringify({ ...cur, active: updated.active }));
  }
}

/* ---------- UI ---------- */
export default function AdminMembers() {
  // Data
  const [rows, setRows] = useState([]);

  // Filters & search
  const [tab, setTab] = useState("All");               // All | Students | Lecturers
  const [query, setQuery] = useState("");              // search
  const [fContinent, setFContinent] = useState("All");
  const [fCountry, setFCountry] = useState("All");
  const [fUniversity, setFUniversity] = useState("All");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setRows(readAllUsersFromStorage());
  }, []);

  // Build option lists from data (dependent)
  const options = useMemo(() => {
    // Unique sets
    const allContinents = new Set();
    const allCountries = new Set();
    const allUniversities = new Set();

    rows.forEach(r => {
      if (r.continent && r.continent !== "—") allContinents.add(r.continent);
      if (r.country && r.country !== "—") allCountries.add(r.country);
      if (r.university && r.university !== "—") allUniversities.add(r.university);
    });

    // Dependent lists
    const countriesForContinent = new Set();
    const universitiesForCountry = new Set();

    rows.forEach(r => {
      const continentPass = fContinent === "All" || r.continent === fContinent;
      if (continentPass && r.country && r.country !== "—") {
        countriesForContinent.add(r.country);
      }
    });

    rows.forEach(r => {
      const continentPass = fContinent === "All" || r.continent === fContinent;
      const countryPass = fCountry === "All" || r.country === fCountry;
      if (continentPass && countryPass && r.university && r.university !== "—") {
        universitiesForCountry.add(r.university);
      }
    });

    return {
      continents: ["All", ...Array.from(allContinents).sort()],
      countries: ["All", ...Array.from((fContinent === "All" ? allCountries : countriesForContinent)).sort()],
      universities: ["All", ...Array.from((fCountry === "All" ? (fContinent === "All" ? allUniversities : universitiesForCountry) : universitiesForCountry)).sort()],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, fContinent, fCountry]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const students = rows.filter(r => r.role === "student").length;
    const lecturers = rows.filter(r => r.role === "lecturer").length;
    const active = rows.filter(r => r.active).length;
    const inactive = total - active;
    return { total, students, lecturers, active, inactive };
  }, [rows]);

  // Filtered list (role tab → location filters → search → sort)
  const filtered = useMemo(() => {
    let list = rows;

    // Role tab
    if (tab === "Students") list = list.filter(r => r.role === "student");
    if (tab === "Lecturers") list = list.filter(r => r.role === "lecturer");

    // Location filters
    if (fContinent !== "All") list = list.filter(r => r.continent === fContinent);
    if (fCountry !== "All") list = list.filter(r => r.country === fCountry);
    if (fUniversity !== "All") list = list.filter(r => r.university === fUniversity);

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(r =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.role || "").toLowerCase().includes(q) ||
        (r.continent || "").toLowerCase().includes(q) ||
        (r.country || "").toLowerCase().includes(q) ||
        (r.university || "").toLowerCase().includes(q) ||
        (r.program || "").toLowerCase().includes(q)
      );
    }

    // Sort by createdAt desc
    return [...list].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  }, [rows, tab, fContinent, fCountry, fUniversity, query]);

  // Pagination derivations
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  // Reset page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [tab, fContinent, fCountry, fUniversity, query, pageSize]);

  // Actions
  function toggleActive(id) {
    setRows(prev => {
      const updated = prev.map(u => {
        if (u.id === id) {
          const nu = { ...u, active: !u.active, raw: { ...u.raw, active: !u.active } };
          writeUserBack(nu);
          return nu;
        }
        return u;
      });
      return updated;
    });
  }

  function exportCSV() {
    const header = [
      "id","name","email","role","gender","active","createdAt",
      "continent","country","university","college","department","program","year"
    ];
    const body = filtered.map(u => [
      safe(u.id), safe(u.name), safe(u.email), safe(u.role), safe(u.gender),
      u.active ? "true" : "false",
      new Date(u.createdAt).toISOString(),
      safe(u.continent), safe(u.country), safe(u.university),
      safe(u.college), safe(u.department), safe(u.program), safe(u.year)
    ]);
    const csv = [header, ...body].map(r => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "members.csv";
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }
  function safe(v){ return v ?? ""; }
  function csvCell(v){
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
    return s;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Members</h1>
      <p className="text-slate-600 mt-1">View and manage registered students and lecturers.</p>

      {/* Stats */}
      <div className="mt-6 grid md:grid-cols-5 gap-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="Students" value={stats.students} />
        <Stat label="Lecturers" value={stats.lecturers} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Inactive" value={stats.inactive} />
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <Tabs value={tab} onChange={setTab} items={["All","Students","Lecturers"]} />

        {/* Location filters */}
        <select
          value={fContinent}
          onChange={(e)=>{ setFContinent(e.target.value); setFCountry("All"); setFUniversity("All"); }}
          className="border border-slate-300 rounded-lg px-3 py-2"
          title="Filter by Continent"
        >
          {options.continents?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>

        <select
          value={fCountry}
          onChange={(e)=>{ setFCountry(e.target.value); setFUniversity("All"); }}
          className="border border-slate-300 rounded-lg px-3 py-2"
          title="Filter by Country"
        >
          {options.countries?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>

        <select
          value={fUniversity}
          onChange={(e)=> setFUniversity(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2"
          title="Filter by University"
        >
          {options.universities?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>

        <div className="ml-auto flex gap-2">
          <input
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
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
              <Th>University</Th>
              <Th>Gender</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan="10" className="text-center py-8 text-slate-500">No members found.</td>
              </tr>
            )}
            {paged.map(u => (
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
                      onClick={()=>alert(JSON.stringify(u.raw, null, 2))}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                    <button
                      onClick={()=>toggleActive(u.id)}
                      className="text-slate-700 hover:underline"
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
            onChange={(e)=>setPageSize(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
            title="Rows per page"
          >
            {[10,20,50,100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button
            onClick={()=>setPage(p => Math.max(1, p-1))}
            disabled={pageSafe <= 1}
            className="border border-slate-300 rounded-lg px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={()=>setPage(p => Math.min(totalPages, p+1))}
            disabled={pageSafe >= totalPages}
            className="border border-slate-300 rounded-lg px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Tip: Location filters are dependent (Continent → Country → University). When you move to a backend,
        keep this UI and replace the storage helpers with API calls (server-side filtering & pagination).
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
      {items.map(it => (
        <button
          key={it}
          onClick={()=>onChange(it)}
          className={`px-3 py-1.5 rounded-full text-sm ${value===it ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`}
        >
          {it}
        </button>
      ))}
    </div>
  );
}
function Th({ children }) {
  return <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3">{children}</th>;
}
function Td({ children, className="" }) {
  return <td className={`px-4 py-3 text-sm text-slate-800 ${className}`}>{children}</td>;
}