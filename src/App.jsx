/// src/App.jsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import StudentSignUp from "./pages/StudentSignUp.jsx";
import LecturerSignUp from "./pages/LecturerSignUp.jsx";

/* === NEW: real pages === */
import Login from "./pages/Login.jsx";
import ForgotStart from "./pages/ForgotStart.jsx";
import ForgotVerify from "./pages/ForgotVerify.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

import StudentDashboard from "./pages/StudentDashboard.jsx";
import LecturerDashboard from "./pages/LecturerDashboard.jsx";
/* === NEW PAGES (import them) === */
import UniversityAcademicPlatform from "./pages/UniversityAcademicPlatform.jsx";
import GlobalAcademicPlatform from "./pages/GlobalAcademicPlatform.jsx";
import StudentMarketplace from "./pages/StudentMarketplace.jsx";
import ContactLecturer from "./pages/ContactLecturer.jsx";
import LecturerMessages from "./pages/LecturerMessages.jsx";





/* ——— add this import so 404 can route logged-in users nicely ——— */
import { getLoggedInUser } from "./lib/authState.js";

// --- Page stubs (keep these simple wrappers for other static pages) ---
function PageWrap({ title, children }) {
  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-3 text-slate-700">{children}</div>
    </div>
  );
}

const Home = () => (
  <PageWrap title="Home">
    Welcome to ScholarsKnowledge. Replace this with your landing content.
  </PageWrap>
);

const About = () => (
  <PageWrap title="About">
    Tell visitors what ScholarsKnowledge is about.
  </PageWrap>
);

const EduFinancing = () => (
  <PageWrap title="EduFinancing">
    Financing options, lenders, and guidance go here.
  </PageWrap>
);

const StudyInUS = () => (
  <PageWrap title="Study in The U.S">
    Admission paths, visas, timelines, and resources.
  </PageWrap>
);

const Scholarships = () => (
  <PageWrap title="Scholarships">
    List scholarships and filters here.
  </PageWrap>
);

/* ——— replace NotFound with a smart version (if logged-in, send to dashboard) ——— */
function NotFound() {
  const u = getLoggedInUser();
  if (u?.role) {
    const role = (u.role || "student").toLowerCase();
    return <Navigate to={role === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard"} replace />;
  }
  return (
    <PageWrap title="Page not found">
      We couldn’t find that page.
    </PageWrap>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Navbar />

      <Routes>
        {/* signups (use imported real pages) */}
        <Route path="/signup/student" element={<StudentSignUp />} />
        <Route path="/signup/lecturer" element={<LecturerSignUp />} />

        {/* canonical home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />

        {/* top-level */}
        <Route path="/about" element={<About />} />
        <Route path="/edufinancing" element={<EduFinancing />} />
        <Route path="/study-in-us" element={<StudyInUS />} />
        <Route path="/scholarships" element={<Scholarships />} />

        {/* aliases for older links (still point to imported pages) */}
        <Route path="/student-sign-up" element={<StudentSignUp />} />
        <Route path="/lecturer-sign-up" element={<LecturerSignUp />} />

        {/* auth */}
        <Route path="/login" element={<Login />} />

        {/* helpful aliases so stray links don’t 404 (non-breaking) */}
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="/auth/register/student" element={<Navigate to="/student-sign-up" replace />} />
        <Route path="/auth/register/lecturer" element={<Navigate to="/lecturer-sign-up" replace />} />

        {/* forgot password (PIN flow) */}
        <Route path="/forgot" element={<ForgotStart />} />
        <Route path="/forgot/verify" element={<ForgotVerify />} />
        <Route path="/forgot/reset" element={<ForgotReset />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        /* optional: keep old path working by redirecting it */
        <Route path="/forgot/reset" element={<Navigate to="/reset-password" replace />} />


    

        

        {/* dashboards */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />


        {/* contact lecturer */}
       {/* helpful aliases (all point to the same page) */}
       <Route path="/contact" element={<ContactLecturer />} />
       <Route path="/contact-lecturer/*" element={<ContactLecturer />} />
       <Route path="/lecturer/messages" element={<LecturerMessages />} />
       




        {/* === NEW ROUTES for the three pages === */}
        <Route path="/platform/university" element={<UniversityAcademicPlatform />} />
        <Route path="/platform/global" element={<GlobalAcademicPlatform />} />
        <Route path="/marketplace" element={<StudentMarketplace />} />
        
         

        {/* catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}