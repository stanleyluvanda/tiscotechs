// src/lib/amplify.js
import { Amplify } from "aws-amplify";

const userPoolId = String(import.meta.env.VITE_COGNITO_USER_POOL_ID || "").trim();
const clientId = String(import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || "").trim();
const domain = String(import.meta.env.VITE_COGNITO_DOMAIN || "").trim();

const redirectIn =
  String(import.meta.env.VITE_COGNITO_REDIRECT_SIGNIN || "").trim() ||
  "http://localhost:5176/auth/callback";

const redirectOut =
  String(import.meta.env.VITE_COGNITO_REDIRECT_SIGNOUT || "").trim() ||
  "http://localhost:5176/login";

const SCOPES = ["openid", "email", "profile"];

Amplify.configure({
  Auth: {
    userPoolId,
    userPoolWebClientId: clientId,
    oauth: {
      domain,
      scope: SCOPES,
      scopes: SCOPES,
      redirectSignIn: [redirectIn],
      redirectSignOut: [redirectOut],
      responseType: "code",
    },
    Cognito: {
      userPoolId,
      userPoolClientId: clientId,
      loginWith: {
        oauth: {
          domain,
          scope: SCOPES,
          scopes: SCOPES,
          redirectSignIn: [redirectIn],
          redirectSignOut: [redirectOut],
          responseType: "code",
        },
      },
    },
  },
});