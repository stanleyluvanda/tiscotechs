import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function dashboardForRole(role) {
  if (role === "lecturer") return "/lecturer/dashboard";
  if (role === "partner") return "/partner/welcome";
  return "/student/dashboard";
}

export default function SuperTokensGoogleDone() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  useEffect(() => {
    try {
      const payload = sp.get("payload");

      if (!payload) {
        navigate("/auth-st-test");
        return;
      }

      const data = JSON.parse(atob(payload));

      const user = data.user || {};
      const userId =
        data.userId ||
        user.id ||
        user.uid ||
        user.email;

      localStorage.setItem(
        "currentUser",
        JSON.stringify(user)
      );

      sessionStorage.setItem(
        "currentUser",
        JSON.stringify(user)
      );

      [
        "authUserId",
        "activeUserId",
        "currentUserId",
        "loggedInUserId",
      ].forEach((k) => {
        localStorage.setItem(k, userId);
        sessionStorage.setItem(k, userId);
      });

      if (user.role === "partner") {
        localStorage.setItem(
          "partnerAuth",
          JSON.stringify(user)
        );
      }

      window.dispatchEvent(new Event("auth:changed"));
      window.dispatchEvent(new Event("user:updated"));

      navigate(
        dashboardForRole(
          data.role || user.role || "student"
        )
      );
    } catch (err) {
      console.error(err);
      navigate("/auth-st-test");
    }
  }, [navigate, sp]);

  return (
    <div className="p-8 text-center">
      Completing Google login...
    </div>
  );
}