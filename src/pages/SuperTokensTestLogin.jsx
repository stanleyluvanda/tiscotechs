import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API =
  /*"https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st";*/
  "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st-prod";


function normalizeEmail(x) {
  return String(x || "").trim().toLowerCase();
}

function dashboardForRole(role) {
  if (role === "lecturer") return "/lecturer/dashboard";
  if (role === "partner") return "/partner/welcome";
  return "/student/dashboard";
}

export default function SuperTokensTestLogin() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("studenttest1005@scholarsknowledge.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function onSubmitLogin(e) {
    e.preventDefault();
    setError("");
    setResult("");

    const em = normalizeEmail(email);
    if (!em || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      /*const res = await fetch(`${API}/login`, {*/
      /*const res = await fetch(`${API}/migrate-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password, role }),
      });

      const data = await res.json().catch(() => ({}));*/

      /*let res = await fetch(`${API}/migrate-login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: em, password, role }),
});

let data = await res.json().catch(() => ({}));

if (!res.ok && data?.error === "INVALID_CREDENTIALS") {
  res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: em, password, role }),
  });

  data = await res.json().catch(() => ({}));
}*/
let res = await fetch(`${API}/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: em, password, role }),
});

let data = await res.json().catch(() => ({}));

if (!res.ok && data?.error === "INVALID_CREDENTIALS") {
  res = await fetch(`${API}/migrate-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: em, password, role }),
  });

  data = await res.json().catch(() => ({}));
}
      setResult(JSON.stringify(data, null, 2));

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Login failed.");
        return;
      }

      const baseUser = data.user || {};
      const userId = data.userId || baseUser.id || baseUser.uid || em;

      const user = {
        ...baseUser,
        id: userId,
        uid: userId,
        email: data.email || baseUser.email || em,
        role: data.role || baseUser.role || role,
        name:
          baseUser.name ||
          baseUser.fullName ||
          baseUser.orgName ||
          em.split("@")[0],
        fullName:
          baseUser.fullName ||
          baseUser.name ||
          baseUser.orgName ||
          em.split("@")[0],
      };

      const ID_KEYS = ["authUserId", "activeUserId", "currentUserId", "loggedInUserId"];

[
  "currentUser",
  "currentUserId",
  "authUserId",
  "activeUserId",
  "loggedInUserId",
  "studentAuth",
  "lecturerAuth",
  "partnerAuth",
  "user",
  "profile",
].forEach((k) => {
  localStorage.removeItem(k);
  sessionStorage.removeItem(k);
});

sessionStorage.setItem("currentUser", JSON.stringify(user));
localStorage.setItem("currentUser", JSON.stringify(user));

for (const k of ID_KEYS) {
  sessionStorage.setItem(k, userId);
  localStorage.setItem(k, userId);
}

const users = JSON.parse(localStorage.getItem("users") || "[]");
const idx = users.findIndex(
  (u) => u?.id === userId || u?.uid === userId || u?.email === user.email
);

if (idx >= 0) users[idx] = user;
else users.push(user);

localStorage.setItem("users", JSON.stringify(users));

const usersById = JSON.parse(localStorage.getItem("usersById") || "{}");
usersById[userId] = user;
localStorage.setItem("usersById", JSON.stringify(usersById));

      if (user.role === "partner") {
        localStorage.setItem("partnerAuth", JSON.stringify(user));
      }

      window.dispatchEvent(new Event("auth:changed"));
window.dispatchEvent(new Event("user:updated"));

      navigate(dashboardForRole(user.role));
    } catch (err) {
      setError(err?.message || "Network error. Please try again.");
    }
  }

  async function onTestRegister() {
    setError("");
    setResult("");

    const em = normalizeEmail(email);
    if (!em || !password) {
      setError("Please enter email and password.");
      return;
    }

    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em, password, role }),
    });

    const data = await res.json().catch(() => ({}));
    setResult(JSON.stringify(data, null, 2));

    if (!res.ok || !data?.ok) {
      setError(data?.error || "Registration failed.");
    }
  }



  async function onGoogleLogin() {
  setError("");
  setResult("");

  try {
    const res = await fetch(`${API}/authorisationurl?thirdPartyId=google`);
    const data = await res.json().catch(() => ({}));

    setResult(JSON.stringify(data, null, 2));

    if (!res.ok || !data?.url) {
      setError(data?.error || "Could not start Google login.");
      return;
    }

    window.location.href = data.url;
  } catch (err) {
    setError(err?.message || "Google login failed.");
  }
}










  const RoleTabs = (
    <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200">
      {["student", "lecturer", "partner"].map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          className={`py-2 font-medium ${
            role === r ? "bg-blue-600 text-white" : "bg-white text-slate-700"
          }`}
          type="button"
        >
          {r[0].toUpperCase() + r.slice(1)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50">
      <div
        className="pointer-events-none absolute -left-[420px] -top-[260px] h-[900px] w-[900px] rounded-full opacity-80 blur-[55px]"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(190,214,255,.95), rgba(214,196,255,.55), rgba(214,196,255,0))",
        }}
      />
      <div
        className="pointer-events-none absolute -right-[380px] -top-[420px] h-[900px] w-[900px] rounded-full opacity-80 blur-[55px]"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,233,126,.95), rgba(255,206,120,.55), rgba(255,206,120,0))",
        }}
      />

      <main className="relative z-10 flex-1">
        <section className="mx-auto max-w-md px-4 py-12">
          <div className="text-center">
            <img
              src="/images/1754280544595.jpeg"
              alt="ScholarsKnowledge Logo"
              className="mx-auto h-14 w-14 rounded-full object-cover"
            />
            <h1 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
              SuperTokens Test Login
            </h1>
          </div>

          {RoleTabs}

          <form
            onSubmit={onSubmitLogin}
            className="mt-6 space-y-4 rounded-2xl border bg-white/70 p-6"
          >
            {error && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-600">
                {error}
              </p>
            )}

            <label className="block">
              <span className="mb-1 block text-sm text-slate-600">Email</span>
              <input
                type="email"
                className="w-full rounded border px-3 py-2"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-slate-600">Password</span>
              <input
                type="password"
                className="w-full rounded border px-3 py-2"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button
              type="button"
              onClick={onTestRegister}
              className="w-full rounded border px-3 py-2"
            >
              Test Register with SuperTokens
            </button>

            <button
  type="button"
  onClick={onGoogleLogin}
  className="w-full rounded border px-3 py-2 flex items-center justify-center gap-2"
>
  <img
    src="/images/Google icon.svg"
    alt=""
    className="h-5 w-5"
  />
  <span>Continue with Google</span>
</button>

            <button
              type="submit"
              className="w-full rounded bg-[#1a73e8] py-2 font-semibold text-white hover:opacity-90"
            >
              {/*Log in with SuperTokens*/}
              Log in / Migrate with SuperTokens
            </button>

            <pre className="max-h-48 overflow-auto rounded bg-slate-900 p-3 text-xs text-white">
              {result}
            </pre>

            <div className="text-center text-sm text-slate-600">
              Production Cognito login is still here:{" "}
              <Link className="text-[#1a73e8] underline" to="/login">
                Back to normal login
              </Link>
            </div>
          </form>
        </section>
      </main>

      <footer className="bg-blue-900 py-6 text-center text-sm text-white">
        © {new Date().getFullYear()} ScholarsKnowledge ·{" "}
        <a href="/login" className="underline">
          Contact Sales
        </a>
      </footer>
    </div>
);
}

