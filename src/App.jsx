
// src/App.jsx
import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";

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

import PartnerSignUp from "./pages/PartnerSignUp.jsx";
import PartnerLogin from "./pages/PartnerLogin.jsx";

import Contact from "./pages/Contact.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsOfUse from "./pages/TermsOfUse.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";

// Lazy-loaded pages
const StudentDashboard = lazy(() => import("./pages/StudentDashboard.jsx"));
const LecturerDashboard = lazy(() => import("./pages/LecturerDashboard.jsx"));
const UniversityAcademicPlatform = lazy(() =>
  import("./pages/UniversityAcademicPlatform.jsx")
);
const GlobalAcademicPlatform = lazy(() =>
  import("./pages/GlobalAcademicPlatform.jsx")
);
const StudentMarketplace = lazy(() => import("./pages/StudentMarketplace.jsx"));
const ContactLecturer = lazy(() => import("./pages/ContactLecturer.jsx"));
const LecturerMessages = lazy(() => import("./pages/LecturerMessages.jsx"));
const PartnerWelcome = lazy(() => import("./pages/PartnerWelcome.jsx"));
const PartnerSubmitScholarship = lazy(() =>
  import("./pages/PartnerSubmitScholarship.jsx")
);
const Scholarship = lazy(() => import("./pages/Scholarship.jsx"));
const ScholarshipDetail = lazy(() => import("./pages/ScholarshipDetail.jsx"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard.jsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const AdminMembers = lazy(() => import("./pages/AdminMembers.jsx"));
const AdminScholarships = lazy(() =>
  import("./pages/AdminScholarshipList.jsx")
);
const AdminScholarshipForm = lazy(() =>
  import("./pages/AdminScholarshipForm")
);
const AdminVideoPostForm = lazy(() =>
  import("./pages/admin/AdminVideoPostForm.jsx")
);
const AdminVideoPostsList = lazy(() =>
  import("./pages/admin/AdminVideoPostsList.jsx")
);
const AdminStudentConsents = lazy(() =>
  import("./pages/AdminStudentConsents")
);
const StudyInUS = lazy(() => import("./pages/StudyInUS.jsx"));
const VideoTips = lazy(() => import("./pages/VideoTips.jsx"));
const UploadTest = lazy(() => import("./pages/UploadTest.jsx"));
const AdminSupportInbox = lazy(() =>
  import("./pages/AdminSupportInbox.jsx")
);
const AdminModeration = lazy(() => import("./pages/AdminModeration.jsx"));
const FundedGraduateAdmission = lazy(() =>
  import("./pages/FundedGraduateAdmission.jsx")
);
const FundedGraduateAdmissionDetail = lazy(() =>
  import("./pages/FundedGraduateAdmissionDetail.jsx")
);
const PartnerSubmitFundedGraduateAdmission = lazy(() =>
  import("./pages/PartnerSubmitFundedGraduateAdmission.jsx")
);
const AdminFundedGraduateAdmissionList = lazy(() =>
  import("./pages/AdminFundedGraduateAdmissionList.jsx")
);
const STEMPrograms = lazy(() => import("./pages/STEMPrograms"));

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
const Scholarships = () => (
  <PageWrap title="Scholarships">List scholarships here.</PageWrap>
);
const EduInfo = () => (
  <PageWrap title="EduInfo">Education-funding info (stub).</PageWrap>
);
const PartnerSignup = () => (
  <PageWrap title="Partner Sign Up">Partner onboarding (stub).</PageWrap>
);

function RequireRole({ role, redirectTo = "/login" }) {
  const loc = useLocation();
  const u = getLoggedInUser();

  if (!u?.role) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: loc.pathname + loc.search, requiredRole: role }}
      />
    );
  }

  const actual = String(u.role || "").toLowerCase();
  const required = String(role || "").toLowerCase();

  if (actual !== required) {
    if (actual === "lecturer")
      return <Navigate to="/lecturer/dashboard" replace />;
    if (actual === "student")
      return <Navigate to="/student/dashboard" replace />;
    if (actual === "partner")
      return <Navigate to="/partner/dashboard" replace />;
    if (actual === "admin") return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

function NotFound() {
  const u = getLoggedInUser();
  if (u?.role) {
    const role = (u.role || "student").toLowerCase();
    return (
      <Navigate
        to={role === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard"}
        replace
      />
    );
  }
  return <PageWrap title="Page not found">We couldn’t find that page.</PageWrap>;
}

function AppLoader() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 text-slate-600">
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Navbar />

      <Suspense fallback={<AppLoader />}>
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
          <Route
            path="/scholarships"
            element={<Navigate to="/scholarship" replace />}
          />
          <Route path="/scholarship" element={<Scholarship />} />
          <Route path="/scholarship/:id" element={<ScholarshipDetail />} />

          <Route
            path="/eduinfo"
            element={<Navigate to="/edufinancing" replace />}
          />

          <Route
            path="/funded-graduate-admission"
            element={<FundedGraduateAdmission />}
          />
          <Route
            path="/funded-graduate-admission/:id"
            element={<FundedGraduateAdmissionDetail />}
          />
          <Route
            path="/partner/submit-funded-graduate-admission"
            element={<PartnerSubmitFundedGraduateAdmission />}
          />
          <Route
            path="/admin/funded-graduate-admissions"
            element={<AdminFundedGraduateAdmissionList />}
          />

          {/* links used by Home.jsx */}
          <Route path="/partner/signup" element={<PartnerSignUp />} />
          <Route path="/partner/login" element={<PartnerLogin />} />
          <Route path="/partner/welcome" element={<PartnerWelcome />} />
          <Route path="/partner/dashboard" element={<PartnerDashboard />} />
          <Route
            path="/partner/submit-scholarship"
            element={<PartnerSubmitScholarship />}
          />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/members" element={<AdminMembers />} />
          <Route path="/admin/scholarships" element={<AdminScholarships />} />
          <Route
            path="/admin/scholarships/:id"
            element={<AdminScholarshipForm />}
          />
          <Route path="/admin/support" element={<AdminSupportInbox />} />

          {/* Admin Scholarships */}
          <Route
            path="/admin/scholarships/new"
            element={<AdminScholarshipForm />}
          />
          <Route
            path="/admin/scholarships/:id/edit"
            element={<AdminScholarshipForm />}
          />
          <Route path="/admin/moderation" element={<AdminModeration />} />

          {/* Admin — video posts */}
          <Route
            path="/admin/posts/video-new"
            element={<AdminVideoPostForm />}
          />
          <Route
            path="/admin/posts/videos"
            element={<AdminVideoPostsList />}
          />
          <Route path="/admin/consents" element={<AdminStudentConsents />} />

          {/* signups */}
          <Route path="/signup/student" element={<StudentSignUp />} />
          <Route path="/signup/lecturer" element={<LecturerSignUp />} />
          <Route path="/student-sign-up" element={<StudentSignUp />} />
          <Route path="/lecturer-sign-up" element={<LecturerSignUp />} />

          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-use" element={<TermsOfUse />} />

          {/* auth & forgot */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/login" element={<Navigate to="/login" replace />} />
          <Route
            path="/auth/register/student"
            element={<Navigate to="/student-sign-up" replace />}
          />
          <Route
            path="/auth/register/lecturer"
            element={<Navigate to="/lecturer-sign-up" replace />}
          />
          <Route path="/forgot" element={<ForgotStart />} />
          <Route path="/forgot/verify" element={<ForgotVerify />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* lecturer protected */}
          <Route element={<RequireRole role="lecturer" redirectTo="/login" />}>
            <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />
            <Route path="/lecturer/messages" element={<LecturerMessages />} />
          </Route>

          {/* student protected */}
          <Route element={<RequireRole role="student" redirectTo="/login" />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/video-tips" element={<VideoTips />} />
            <Route path="/marketplace" element={<StudentMarketplace />} />
            <Route
              path="/student-marketplace"
              element={<StudentMarketplace />}
            />
          </Route>

          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/stem-programs" element={<STEMPrograms />} />

          {/* contact & features */}
          <Route path="/contact" element={<Contact />} />
          <Route path="/contact-lecturer/*" element={<ContactLecturer />} />
          <Route
            path="/platform/university"
            element={<UniversityAcademicPlatform />}
          />
          <Route
            path="/platform/global"
            element={<GlobalAcademicPlatform />}
          />
          <Route path="/upload-test" element={<UploadTest />} />

          {/* catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}