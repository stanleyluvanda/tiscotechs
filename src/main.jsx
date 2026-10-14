
// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";

import "./lib/amplify";
import "aws-amplify/auth/enable-oauth-listener";
import "./index.css";

import App from "./App.jsx";
import BannerAdPortal from "./components/BannerAdPortal.jsx";

// SuperTokens session management
import SuperTokens from "supertokens-web-js";
import Session from "supertokens-web-js/recipe/session";

// Preserve separate local and production authentication endpoints
const IS_LOCAL_AUTH =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

SuperTokens.init({
  appInfo: {
    appName: "ScholarsKnowledge",
    apiDomain:
      "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com",
    apiBasePath: IS_LOCAL_AUTH
      ? "/default/api/auth-st"
      : "/default/api/auth-st-prod",
  },
  recipeList: [
  Session.init({
    tokenTransferMethod: "header",
  }),
],
});

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
/*import React from "react";
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
);*/