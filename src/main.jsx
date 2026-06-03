
// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";

import "./lib/amplify";
import "aws-amplify/auth/enable-oauth-listener";
import "./index.css";

import App from "./App.jsx";
import BannerAdPortal from "./components/BannerAdPortal.jsx";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(container).render(
  <React.StrictMode>
    <App />
    <BannerAdPortal />
  </React.StrictMode>
);