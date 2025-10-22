// src/App.jsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import StudentSignUp from "./pages/StudentSignUp.jsx";
import LecturerSignUp from "./pages/LecturerSignUp.jsx";

import Login from "./pages/Login.jsx";
import ForgotStart from "./pages/ForgotStart.jsx";
import ForgotVerify from "./pages/ForgotVerify.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

import StudentDashboard from "./pages/StudentDashboard.jsx";
import LecturerDashboard from "./pages/LecturerDashboard.jsx";

import UniversityAcademicPlatform from "./pages/UniversityAcademicPlatform.jsx";
import GlobalAcademicPlatform from "./pages/GlobalAcademicPlatform.jsx";
import StudentMarketplace from "./pages/StudentMarketplace.jsx";
import ContactLecturer from "./pages/ContactLecturer.jsx";
import LecturerMessages from "./pages/LecturerMessages.jsx";

import { getLoggedInUser } from "./lib/authState.js";

// Simple page wrappers
function PageWrap({ title, children }) {
  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-3 text-slate-700">{children}</div>
    </div>
  );
}
const Home = () => <PageWrap title="Home">Welcome to ScholarsKnowledge.</PageWrap>;
const About = () => <PageWrap title="About">Tell visitors what ScholarsKnowledge is about.</PageWrap>;
const EduFinancing = () => <PageWrap title="EduFinancing">Financing info.</PageWrap>;
const StudyInUS = () => <PageWrap title="Study in The U.S">Admissions, visas, timelines.</PageWrap>;
const Scholarships = () => <PageWrap title="Scholarships">List scholarships here.</PageWrap>;

function NotFound() {
  const u = getLoggedInUser();
  if (u?.role) {
    const role = (u.role || "student").toLowerCase();
    return <Navigate to={role === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard"} replace />;
  }
  return <PageWrap title="Page not found">We couldn’t find that page.</PageWrap>;
}

export default function App() {
  return (
    <HashRouter>
      <Navbar />

      <Routes>
        {/* canonical home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />

        {/* top-level */}
        <Route path="/about" element={<About />} />
        <Route path="/edufinancing" element={<EduFinancing />} />
        <Route path="/study-in-us" element={<StudyInUS />} />
        <Route path="/scholarships" element={<Scholarships />} />

        {/* signups */}
        <Route path="/signup/student" element={<StudentSignUp />} />
        <Route path="/signup/lecturer" element={<LecturerSignUp />} />
        {/* legacy aliases */}
        <Route path="/student-sign-up" element={<StudentSignUp />} />
        <Route path="/lecturer-sign-up" element={<LecturerSignUp />} />

        {/* auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="/auth/register/student" element={<Navigate to="/student-sign-up" replace />} />
        <Route path="/auth/register/lecturer" element={<Navigate to="/lecturer-sign-up" replace />} />

        {/* forgot-password flow */}
        <Route path="/forgot" element={<ForgotStart />} />
        <Route path="/forgot/verify" element={<ForgotVerify />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* dashboards */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />

        {/* contact & messages */}
        <Route path="/contact" element={<ContactLecturer />} />
        <Route path="/contact-lecturer/*" element={<ContactLecturer />} />
        <Route path="/lecturer/messages" element={<LecturerMessages />} />

        {/* feature pages */}
        <Route path="/platform/university" element={<UniversityAcademicPlatform />} />
        <Route path="/platform/global" element={<GlobalAcademicPlatform />} />
        <Route path="/marketplace" element={<StudentMarketplace />} />

        {/* catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}