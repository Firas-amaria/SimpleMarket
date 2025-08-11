// src/utils/api.js
import axios from "axios";

/**
 * Helpers to decode JWT and check expiry.
 */
function decodeJwt(token) {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function getExpMs(token) {
  const p = decodeJwt(token);
  return p?.exp ? p.exp * 1000 : 0;
}
function msUntilExpiry(token) {
  const expMs = getExpMs(token);
  return expMs ? expMs - Date.now() : 0;
}
function isExpiringSoon(token, thresholdSec = 60) {
  return msUntilExpiry(token) <= thresholdSec * 1000;
}

/**
 * Axios instance.
 * Note: REACT_APP_API_URL should be like http://localhost:5000/api (as you set).
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send/receive the refresh cookie
});

// Attach Authorization if we have a token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Single-flight refresh to avoid stampedes.
 */
let refreshPromise = null;
async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await api.post(
          "/auth/refresh",
          {},
          { headers: { "X-Requested-With": "XMLHttpRequest" } }
        );
        const { accessToken, user } = res.data || {};
        if (accessToken) localStorage.setItem("token", accessToken);
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
          window.dispatchEvent(new Event("userChanged"));
        }
        return accessToken;
      } catch (err) {
        // ensure local session is cleared on refresh failure
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("region");
        throw err;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * One-time notice guard so we don't spam multiple alerts during a burst of 401s.
 */
let logoutNoticeShown = false;
async function hardLogoutWithNotice(
  message = "Your session expired. Please log in again."
) {
  if (logoutNoticeShown) return;
  logoutNoticeShown = true;

  // Best-effort: clear server cookie
  try {
    await api.post("/auth/logout"); // interceptor won't refresh on auth routes
  } catch {
    /* ignore */
  }

  // Clear local session
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("region");
  window.dispatchEvent(new Event("userChanged"));

  // Tell the user, then navigate
  if (typeof window !== "undefined") {
    // Simple built-in alert (blocking until user clicks OK)
    window.alert(message);
    window.location.href = "/login";
  }
}

/**
 * Response interceptor:
 * - On 401 for non-auth routes, try one refresh then retry original request.
 * - On refresh failure, show alert + redirect.
 */
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;

    if (!status || !original) return Promise.reject(error);

    const urlPath = (original.url || "").toLowerCase();
    const isAuthPath =
      urlPath.includes("/auth/login") ||
      urlPath.includes("/auth/register") ||
      urlPath.includes("/auth/logout") ||
      urlPath.includes("/auth/refresh");

    if (status === 401 && !original.__isRetryAfterRefresh && !isAuthPath) {
      try {
        await refreshAccessToken();
        original.__isRetryAfterRefresh = true;

        const newToken = localStorage.getItem("token");
        if (newToken) {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${newToken}`;
        }

        return api(original);
      } catch (refreshErr) {
        // Refresh failed → alert + redirect to login
        await hardLogoutWithNotice(
          "Your session has expired. Please log in again."
        );
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Public helper to refresh when access token is about to expire.
 * Call this on user interactions (click/keydown/navigation/visibilitychange).
 */
api.refreshIfExpiringSoon = async (thresholdSec = 60) => {
  const token = localStorage.getItem("token");
  if (!token) return;
  if (isExpiringSoon(token, thresholdSec)) {
    try {
      await refreshAccessToken();
    } catch {
      // Let the next protected request trigger the alert+redirect path.
    }
  }
};

export default api;
