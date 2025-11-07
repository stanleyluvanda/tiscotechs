
// src/App.jsx
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";

import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Partner from "./pages/Partner.jsx";
import EduFinancing from "./pages/EduFinancing.jsx";

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
import PartnerSignUp from "./pages/PartnerSignUp.jsx";
import PartnerLogin from "./pages/PartnerLogin.jsx";
import PartnerWelcome from "./pages/PartnerWelcome.jsx";
import PartnerSubmitScholarship from "./pages/PartnerSubmitScholarship.jsx";
import Scholarship from "./pages/Scholarship.jsx";
import ScholarshipDetail from "./pages/ScholarshipDetail.jsx";
import PartnerDashboard from "./pages/PartnerDashboard.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminMembers from "./pages/AdminMembers.jsx";
import AdminScholarships from "./pages/AdminScholarshipList.jsx";
import AdminScholarshipForm from "./pages/AdminScholarshipForm";
import AdminVideoPostForm from "./pages/admin/AdminVideoPostForm.jsx";
import AdminVideoPostsList from "./pages/admin/AdminVideoPostsList.jsx";
import AdminStudentConsents from "./pages/AdminStudentConsents";
import StudyInUS from "./pages/StudyInUS.jsx";
import Contact from "./pages/Contact.jsx";


// ❌ Remove this import to avoid clash with inline stub
// import StudyInUSPage from "./pages/StudyInUS.jsx";

import Footer from "./components/Footer.jsx";

import { getLoggedInUser } from "./lib/authState.js";

function PageWrap({ title, children }) {
  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-3 text-slate-700">{children}</div>
    </div>
  );
}

/* Simple in-file stubs to match your Navbar items (remove when real pages exist) */
//const StudyInUS = () => (
  //<PageWrap title="Study in The U.S">Admissions, visas, timelines.</PageWrap>
//);
const Scholarships = () => <PageWrap title="Scholarships">List scholarships here.</PageWrap>;
const EduInfo = () => <PageWrap title="EduInfo">Education-funding info (stub).</PageWrap>;
const PartnerSignup = () => <PageWrap title="Partner Sign Up">Partner onboarding (stub).</PageWrap>;

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
    <Router>
      <Navbar />

      <Routes>
        {/* canonical home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />

        {/* top-level */}
        <Route path="/about" element={<About />} />
        <Route path="/partner" element={<Partner />} />
        <Route path="/edufinancing" element={<EduFinancing />} />
        <Route path="/study-in-us" element={<StudyInUS />} />
        {/* keep one redirect alias only */}
        <Route path="/scholarships" element={<Navigate to="/scholarship" replace />} />
        <Route path="/scholarship" element={<Scholarship />} />
        <Route path="/scholarship/:id" element={<ScholarshipDetail />} />
        <Route path="/study-in-us" element={<StudyInUS />} />
        <Route path="/eduinfo" element={<Navigate to="/edufinancing" replace />} />

        {/* links used by Home.jsx */}
        <Route path="/eduinfo" element={<EduInfo />} />
        <Route path="/partner/signup" element={<PartnerSignUp />} />
        <Route path="/partner/login" element={<PartnerLogin />} />
        <Route path="/partner/welcome" element={<PartnerWelcome />} />
        <Route path="/partner/dashboard" element={<PartnerDashboard />} />
        <Route path="/partner/submit-scholarship" element={<PartnerSubmitScholarship />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/members" element={<AdminMembers />} />
        <Route path="/admin/scholarships" element={<AdminScholarships />} />
        <Route path="/admin/scholarships/:id" element={<AdminScholarshipForm />} />

        {/* Admin Scholarships */}
        <Route path="/admin/scholarships/new" element={<AdminScholarshipForm />} />
        <Route path="/admin/scholarships/:id/edit" element={<AdminScholarshipForm />} />

        {/* Admin — video posts */}
        <Route path="/admin/posts/video-new" element={<AdminVideoPostForm />} />
        <Route path="/admin/posts/videos" element={<AdminVideoPostsList />} />
        <Route path="/admin/consents" element={<AdminStudentConsents />} />

        {/* signups */}
        <Route path="/signup/student" element={<StudentSignUp />} />
        <Route path="/signup/lecturer" element={<LecturerSignUp />} />
        <Route path="/student-sign-up" element={<StudentSignUp />} />
        <Route path="/lecturer-sign-up" element={<LecturerSignUp />} />

        {/* auth & forgot */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="/auth/register/student" element={<Navigate to="/student-sign-up" replace />} />
        <Route path="/auth/register/lecturer" element={<Navigate to="/lecturer-sign-up" replace />} />
        <Route path="/forgot" element={<ForgotStart />} />
        <Route path="/forgot/verify" element={<ForgotVerify />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* dashboards */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />

        {/* contact & features */}
      
        <Route path="/contact" element={<Contact />} />
        <Route path="/contact-lecturer/*" element={<ContactLecturer />} />
        <Route path="/lecturer/messages" element={<LecturerMessages />} />
        <Route path="/platform/university" element={<UniversityAcademicPlatform />} />
        <Route path="/platform/global" element={<GlobalAcademicPlatform />} />
        <Route path="/marketplace" element={<StudentMarketplace />} />

        {/* catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}