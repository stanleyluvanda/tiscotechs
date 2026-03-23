
// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "aws-amplify/auth/enable-oauth-listener";
import "./lib/amplify";                 // ✅ move this up first
import App from "./App.jsx";
import "./index.css";
import BannerAdPortal from "./components/BannerAdPortal.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <BannerAdPortal />
  </React.StrictMode>
);