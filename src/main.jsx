// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import BannerAdPortal from "./components/BannerAdPortal.jsx";  // ✅ add this line

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <BannerAdPortal />   {/* ✅ inject Google ad into #ad-banner */}
  </React.StrictMode>
);