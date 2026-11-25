// src/lib/partnerAuthenticatedApi.js

import { ScholarsAuthSession } from "./scholarsAuthSession";

const PARTNER_API_BASE =
  "https://i0iqoh4ur0.execute-api.us-east-1.amazonaws.com/prod";

export class PartnerApiError extends Error {
  constructor(message, status = 0, code = "PARTNER_API_ERROR") {
    super(message);
    this.name = "PartnerApiError";
    this.status = status;
    this.code = code;
  }
}

export async function partnerAuthenticatedFetch(path, options = {}) {
  const requestPath = String(path || "").trim();

  // Restrict authenticated requests to the Scholarships API.
  if (
    requestPath !== "/api/scholarships" &&
    !requestPath.startsWith("/api/scholarships/") &&
    !requestPath.startsWith("/api/scholarships?")
  ) {
    throw new PartnerApiError(
      "Invalid Partner API path.",
      400,
      "INVALID_API_PATH"
    );
  }

  const url = new URL(PARTNER_API_BASE + requestPath);
  const allowedBase = new URL(PARTNER_API_BASE);

  if (
    url.origin !== allowedBase.origin ||
    (
      url.pathname !== "/prod/api/scholarships" &&
      !url.pathname.startsWith("/prod/api/scholarships/")
    )
  ) {
    throw new PartnerApiError(
      "Invalid Partner API destination.",
      400,
      "INVALID_API_DESTINATION"
    );
  }

  // Reuse the existing SuperTokens session.
  const sessionExists =
    await ScholarsAuthSession.doesSessionExist();

  if (!sessionExists) {
    throw new PartnerApiError(
      "Your session has expired. Please log in again.",
      401,
      "SESSION_REQUIRED"
    );
  }

  const accessToken =
    await ScholarsAuthSession.getAccessToken();

  if (!accessToken) {
    throw new PartnerApiError(
      "Your session has expired. Please log in again.",
      401,
      "ACCESS_TOKEN_UNAVAILABLE"
    );
  }

  // Preserve existing request headers.
  const headers = new Headers(options.headers || {});

  headers.set(
    "Authorization",
    `Bearer ${accessToken}`
  );

  // Execute the authenticated API request.
  let response;

  try {
    response = await fetch(url.toString(), {
      ...options,
      headers,
      cache: "no-store",
      redirect: "error"
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new PartnerApiError(
      "Unable to connect to the server. Please try again.",
      0,
      "NETWORK_ERROR"
    );
  }

  // Reject missing, invalid or expired sessions.
  if (response.status === 401) {
    throw new PartnerApiError(
      "Your session has expired. Please log in again.",
      401,
      "UNAUTHORIZED"
    );
  }

  // Reject unauthorized roles or listing ownership.
  if (response.status === 403) {
    throw new PartnerApiError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN"
    );
  }

  // Handle other backend errors.
  if (!response.ok) {
    let data = {};

    try {
      data = await response.json();
    } catch {
      // Response may not contain JSON.
    }

    throw new PartnerApiError(
      data.message ||
        data.error ||
        `Request failed with HTTP ${response.status}.`,
      response.status,
      data.error || "API_REQUEST_FAILED"
    );
  }

  return response;
}