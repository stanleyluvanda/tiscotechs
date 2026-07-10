
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
/*import Footer from "./components/Footer.jsx";*/
import AuthCallback from "./pages/AuthCallback.jsx";
import Home from "./pages/Home.jsx";
import { getLoggedInUser } from "./lib/authState.js";
import ScholarshipTipsWinningSOP from "./pages/ScholarshipTipsWinningSOP";
import ScholarshipTips from "./pages/ScholarshipTips";
import ScholarshipTipsRecommendationLetters from "./pages/ScholarshipTipsRecommendationLetters";
import ScholarshipTipsResearchProposal from "./pages/ScholarshipTipsResearchProposal";
import ScholarshipTipsScholarshipCV from "./pages/ScholarshipTipsScholarshipCV";
import ScholarshipTipsInterviewQuestions from "./pages/ScholarshipTipsInterviewQuestions";
import ScholarshipTipsFullyFundedMastersPhD from "./pages/ScholarshipTipsFullyFundedMastersPhD";
import ScholarshipTipsStayingOnTrackAbroad from "./pages/ScholarshipTipsStayingOnTrackAbroad";
import FellowshipGuide from "./pages/FellowshipGuide";
/*import GlobalAcademicPlatform from "./pages/GlobalAcademicPlatform.jsx";*/
/*import UniversityAcademicPlatform from "./pages/UniversityAcademicPlatform.jsx";*/

const About = lazy(() => import("./pages/About.jsx"));
const Partner = lazy(() => import("./pages/Partner.jsx"));
const EduFinancing = lazy(() => import("./pages/EduFinancing.jsx"));

const StudentSignUp = lazy(() => import("./pages/StudentSignUp.jsx"));
const LecturerSignUp = lazy(() => import("./pages/LecturerSignUp.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const SuperTokensTestLogin = lazy(() =>
  import("./pages/SuperTokensTestLogin.jsx")
);
const SuperTokensGoogleDone = lazy(() =>
  import("./pages/SuperTokensGoogleDone.jsx")
);
const ForgotStart = lazy(() => import("./pages/ForgotStart.jsx"));
const ForgotVerify = lazy(() => import("./pages/ForgotVerify.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));

const PartnerSignUp = lazy(() => import("./pages/PartnerSignUp.jsx"));
const PartnerLogin = lazy(() => import("./pages/PartnerLogin.jsx"));
const PartnerWelcome = lazy(() => import("./pages/PartnerWelcome.jsx"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard.jsx"));
const PartnerSubmitScholarship = lazy(() =>
  import("./pages/PartnerSubmitScholarship.jsx")
);
const PartnerSubmitFundedGraduateAdmission = lazy(() =>
  import("./pages/PartnerSubmitFundedGraduateAdmission.jsx")
);

const Contact = lazy(() => import("./pages/Contact.jsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.jsx"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse.jsx"));

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

const Scholarship = lazy(() => import("./pages/Scholarship.jsx"));
const ScholarshipDetail = lazy(() => import("./pages/ScholarshipDetail.jsx"));
const Fellowships = lazy(() => import("./pages/Fellowships.jsx"));

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
const AdminSupportInbox = lazy(() =>
  import("./pages/AdminSupportInbox.jsx")
);
const AdminModeration = lazy(() => import("./pages/AdminModeration.jsx"));
const AdminFundedGraduateAdmissionList = lazy(() =>
  import("./pages/AdminFundedGraduateAdmissionList.jsx")
);

const StudyInUS = lazy(() => import("./pages/StudyInUS.jsx"));
const VideoTips = lazy(() => import("./pages/VideoTips.jsx"));
const UploadTest = lazy(() => import("./pages/UploadTest.jsx"));

const FundedGraduateAdmission = lazy(() =>
  import("./pages/FundedGraduateAdmission.jsx")
);
const FundedGraduateAdmissionDetail = lazy(() =>
  import("./pages/FundedGraduateAdmissionDetail.jsx")
);

const STEMPrograms = lazy(() => import("./pages/STEMPrograms"));
const STEMMBA = lazy(() => import("./pages/STEMMBA"));
const FundingPrograms = lazy(() =>
  import("./pages/FundingPrograms.jsx")
);
const FundingProgramDetail = lazy(() =>
  import("./pages/FundingProgramDetail.jsx")
);

function PageWrap({ title, children }) {
  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-3 text-slate-700">{children}</div>
    </div>
  );
}

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
    if (actual === "lecturer") return <Navigate to="/lecturer/dashboard" replace />;
    if (actual === "student") return <Navigate to="/student/dashboard" replace />;
    if (actual === "partner") return <Navigate to="/partner/dashboard" replace />;
    if (actual === "admin") return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/home" replace />;
  }
  
  return <Outlet />;
}



function NotFound() {
  const u = getLoggedInUser();

  if (u?.role) {
    const role = String(u.role || "").toLowerCase();

    if (role === "lecturer") return <Navigate to="/lecturer/dashboard" replace />;
    if (role === "student") return <Navigate to="/student/dashboard" replace />;
    if (role === "partner") return <Navigate to="/partner/dashboard" replace />;
    if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
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
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />

          <Route path="/about" element={<About />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/edufinancing" element={<EduFinancing />} />
          <Route path="/study-in-us" element={<StudyInUS />} />

          <Route path="/scholarships" element={<Navigate to="/scholarship" replace />} />
          <Route path="/scholarship" element={<Scholarship />} />
          <Route path="/scholarship/:id" element={<ScholarshipDetail />} />

          <Route path="/fellowships" element={<Navigate to="/fellowship" replace />} />
          <Route path="/fellowship" element={<Fellowships />} />
          <Route path="/fellowship/:id" element={<ScholarshipDetail />} />

          <Route path="/eduinfo" element={<Navigate to="/edufinancing" replace />} />

          <Route
            path="/funded-graduate-admission"
            element={<FundedGraduateAdmission />}
          />
          <Route
            path="/funded-graduate-admission/:id"
            element={<FundedGraduateAdmissionDetail />}
          />

          <Route path="/funding-programs" element={<FundingPrograms />} />
          <Route path="/funding-programs/:id" element={<FundingProgramDetail />} />

          <Route path="/partner/signup" element={<PartnerSignUp />} />
          <Route path="/partner/login" element={<PartnerLogin />} />
          <Route path="/partner/welcome" element={<PartnerWelcome />} />

          <Route element={<RequireRole role="partner" redirectTo="/partner/login" />}>
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route
              path="/partner/submit-scholarship"
              element={<PartnerSubmitScholarship />}
            />
            <Route
              path="/partner/submit-funded-graduate-admission"
              element={<PartnerSubmitFundedGraduateAdmission />}
            />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />

          <Route element={<RequireRole role="admin" redirectTo="/admin/login" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/members" element={<AdminMembers />} />

            <Route path="/admin/scholarships" element={<AdminScholarships />} />
            <Route path="/admin/scholarships/new" element={<AdminScholarshipForm />} />
            <Route path="/admin/scholarships/:id" element={<AdminScholarshipForm />} />
            <Route path="/admin/scholarships/:id/edit" element={<AdminScholarshipForm />} />

            <Route path="/admin/support" element={<AdminSupportInbox />} />
            <Route path="/admin/moderation" element={<AdminModeration />} />
            <Route path="/admin/posts/video-new" element={<AdminVideoPostForm />} />
            <Route path="/admin/posts/videos" element={<AdminVideoPostsList />} />
            <Route path="/admin/consents" element={<AdminStudentConsents />} />
            <Route
              path="/admin/funded-graduate-admissions"
              element={<AdminFundedGraduateAdmissionList />}
            />

            <Route path="/upload-test" element={<UploadTest />} />
          </Route>

          <Route path="/signup/student" element={<StudentSignUp />} />
          <Route path="/signup/lecturer" element={<LecturerSignUp />} />
          <Route path="/student-sign-up" element={<StudentSignUp />} />
          <Route path="/lecturer-sign-up" element={<LecturerSignUp />} />

          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-use" element={<TermsOfUse />} />

          <Route path="/login" element={<Login />} />
          <Route path="/auth-st-test" element={<SuperTokensTestLogin />} />
          <Route path="/auth-st-test/google-done"element={<SuperTokensGoogleDone />}/>
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
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route element={<RequireRole role="lecturer" redirectTo="/login" />}>
            <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />
            <Route path="/lecturer/messages" element={<LecturerMessages />} />
          </Route>

          <Route element={<RequireRole role="student" redirectTo="/login" />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/video-tips" element={<VideoTips />} />
            <Route path="/marketplace" element={<StudentMarketplace />} />
            <Route path="/student-marketplace" element={<StudentMarketplace />} />
          </Route>

          <Route path="/stem-programs" element={<STEMPrograms />} />
          <Route path="/stem-mba-guide" element={<STEMMBA />} />

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

          <Route
  path="/scholarship-tips"
  element={<ScholarshipTips />}
/>

<Route
  path="/scholarship-tips/how-to-write-winning-sop"
  element={<ScholarshipTipsWinningSOP />}
/>
<Route
  path="/scholarship-tips/recommendation-letters"
  element={<ScholarshipTipsRecommendationLetters />}
/>
<Route
  path="/scholarship-tips/research-proposal"
  element={<ScholarshipTipsResearchProposal />}
/>
<Route
  path="/scholarship-tips/scholarship-cv"
  element={<ScholarshipTipsScholarshipCV />}
/>
<Route
  path="/scholarship-tips/interview-preparation"
  element={<ScholarshipTipsInterviewQuestions />}
/>
<Route
  path="/scholarship-tips/fully-funded-masters-phd-guide"
  element={<ScholarshipTipsFullyFundedMastersPhD />}
/>
<Route
  path="/scholarship-tips/staying-on-track-abroad"
  element={<ScholarshipTipsStayingOnTrackAbroad />}
/>
<Route path="/fellowship-guide" element={<FellowshipGuide />} />

<Route path="*" element={<NotFound />} />
</Routes>
      </Suspense>
    </Router>
  );
}