// src/utils/api.js
import axios from "axios";

/**
 * Toggle request/response debug logs.
 * Prefer setting REACT_APP_API_DEBUG=1 in your env; fallback to this constant.
 */
const API_DEBUG = 1; // ← set to 0 to silence without env

/**
 * ===== JWT helpers (expiry checks) =====
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
function shortToken(t) {
  return t ? `${String(t).slice(0, 12)}…` : "<none>";
}

/**
 * ===== Axios instance =====
 * Note: REACT_APP_API_URL should be like http://localhost:5000/api
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // include refresh cookie for /auth/refresh
  timeout: 20000,
});

/**
 * ===== Request interceptor =====
 * Attach Authorization bearer token, log if enabled.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (!config.headers) config.headers = {};
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (API_DEBUG) {
    console.debug(
      "[api ->]",
      (config.method || "GET").toUpperCase(),
      config.url,
      {
        hasAuth: !!token,
        token: shortToken(token),
        params: config.params,
        // For safety, don't dump large bodies; show type/keys only
        data:
          config.data && typeof config.data === "object"
            ? { keys: Object.keys(config.data) }
            : config.data ?? null,
      }
    );
  }
  return config;
});

/**
 * ===== Single-flight refresh =====
 * Ensures only one refresh runs at a time; others await the same promise.
 */
let refreshPromise = null;
async function refreshAccessToken() {
  if (!refreshPromise) {
    const doRefresh = async () => {
      try {
        if (API_DEBUG) console.debug("[auth] refreshing access token…");
        // Use the same axios instance; response interceptor skips /auth/* refresh loop.
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
        if (API_DEBUG) {
          console.debug("[auth] refresh OK", {
            token: shortToken(accessToken),
            user: user ? { id: user.id || user._id, role: user.role } : null,
          });
        }
        return accessToken;
      } catch (err) {
        if (API_DEBUG) {
          console.debug("[auth] refresh FAILED", {
            status: err?.response?.status,
            data: err?.response?.data,
          });
        }
        // Ensure local session is cleared on refresh failure
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("region");
        throw err;
      } finally {
        refreshPromise = null;
      }
    };
    refreshPromise = doRefresh();
  }
  return refreshPromise;
}

/**
 * ===== Logout + notice =====
 * Prevent spamming multiple popups during a burst of 401s.
 */
let logoutNoticeShown = false;
async function hardLogoutWithNotice(
  message = "Your session expired. Please log in again."
) {
  if (logoutNoticeShown) return;
  logoutNoticeShown = true;

  try {
    // Best-effort: ask server to clear cookie (will be ignored if already invalid)
    await api.post("/auth/logout");
  } catch {
    /* ignore */
  }

  // Clear local session
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("region");
  window.dispatchEvent(new Event("userChanged"));

  if (typeof window !== "undefined") {
    window.alert(message);
    window.location.href = "/login";
  }
}

/**
 * ===== Response interceptor =====
 * On 401 for non-auth routes: try a single refresh then retry original request.
 */
api.interceptors.response.use(
  (res) => {
    if (API_DEBUG) {
      console.debug(
        "[api <-]",
        (res.config?.method || "GET").toUpperCase(),
        res.config?.url,
        { status: res.status }
      );
    }
    return res;
  },
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;

    if (API_DEBUG) {
      console.debug(
        "[api x ]",
        (original?.method || "GET").toUpperCase(),
        original?.url,
        { status, data: error?.response?.data }
      );
    }

    // If no response or no config, bubble up
    if (!status || !original) return Promise.reject(error);

    // Avoid refresh loops for auth endpoints
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

        // Inject the newly refreshed token for the retry
        const newToken = localStorage.getItem("token");
        if (!original.headers) original.headers = {};
        if (newToken) original.headers.Authorization = `Bearer ${newToken}`;

        if (API_DEBUG) {
          console.debug("[api ~~] retrying after refresh:", original.url, {
            token: shortToken(newToken),
          });
        }
        return api(original);
      } catch (refreshErr) {
        await hardLogoutWithNotice(
          "Your session has expired. Please log in again."
        );
        return Promise.reject(refreshErr);
      }
    }

    // For other errors (or second 401), just bubble up
    return Promise.reject(error);
  }
);

/**
 * ===== Proactive refresh helper =====
 * Call from UI event handlers to keep the token fresh.
 */
api.refreshIfExpiringSoon = async (thresholdSec = 60) => {
  const token = localStorage.getItem("token");
  if (!token) return;
  if (isExpiringSoon(token, thresholdSec)) {
    try {
      await refreshAccessToken();
    } catch {
      // Let the next protected request trigger logout flow.
    }
  }
};

export default api;
