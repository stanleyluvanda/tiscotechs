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

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId: clientId,
      loginWith: {
        oauth: {
          domain,
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [redirectIn],
          redirectSignOut: [redirectOut],
          responseType: "code",
        },
      },
    },
  },
});