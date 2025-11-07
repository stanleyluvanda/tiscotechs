// src/pages/AdminDashboard.jsx
import { Link, useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("adminAuth");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button onClick={logout} className="text-sm text-slate-600 hover:underline">Logout</button>
      </div>
      <p className="text-slate-600 mt-1">Choose what you want to manage.</p>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <AdminCard
          title="Members"
          body="View and manage registered Students & Lecturers. Filter by role, continent, country & university; search; export CSV; deactivate/reactivate."
          to="/admin/members"
          cta="Open Members"
        />
        <AdminCard
          title="Scholarships"
          body="Review, create, and edit scholarships submitted by providers."
          to="/admin/scholarships"
          cta="Open Scholarships"
        />
        <AdminCard
          title="Posts & Media"
          body="Create announcements, upload video posts (YouTube), and share materials."
          to="/admin/posts/video-new"
          cta="New Video Post"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Quick links</div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link className="text-blue-600 hover:underline" to="/admin/members">Members</Link>
          <Link className="text-blue-600 hover:underline" to="/admin/scholarships">Scholarships</Link>
          <Link className="text-blue-600 hover:underline" to="/admin/posts/video-new">New Video Post</Link>
          <Link className="text-blue-600 hover:underline" to="/admin/posts/videos">Manage Video Posts</Link>
          <Link className="text-blue-600 hover:underline" to="/admin/consents">Student Alert Consents</Link>

        </div>
      </div>
    </div>
  );
}

function AdminCard({ title, body, to, cta }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-slate-600">{body}</p>
      <Link
        to={to}
        className="mt-4 inline-block rounded-full bg-slate-900 text-white px-5 py-2.5 font-semibold hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
}