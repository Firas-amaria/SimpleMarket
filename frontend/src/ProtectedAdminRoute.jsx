// src/ProtectedAdminRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api from "./utils/api";

// Decode JWT without a secret
function decodeJwt(token) {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isExpired(token, skewMs = 0) {
  const p = decodeJwt(token);
  if (!p?.exp) return true;
  return Date.now() + skewMs >= p.exp * 1000;
}

export default function ProtectedAdminRoute() {
  const [status, setStatus] = useState("checking"); // "checking" | "allow" | "denyLogin" | "denyHome"

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const token = localStorage.getItem("token");

        if (!user || !token) {
          if (alive) setStatus("denyLogin");
          return;
        }

        if (user.role !== "admin") {
          if (alive) setStatus("denyHome");
          return;
        }

        // Give a small skew so we refresh slightly before expiry
        if (!isExpired(token, 30_000)) {
          if (alive) setStatus("allow");
          return;
        }

        // Token expired/near-expiry → try one proactive refresh
        try {
          await api.post("/auth/refresh", {}, { // <-- send {} (not null)
            headers: { "X-Requested-With": "XMLHttpRequest" },
          });
          if (alive) setStatus("allow");
        } catch {
          if (alive) setStatus("denyLogin");
        }
      } catch {
        if (alive) setStatus("denyLogin");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (status === "checking") return null; // or a tiny loader
  if (status === "denyHome") return <Navigate to="/" replace />;
  if (status === "denyLogin") return <Navigate to="/login" replace />;

  return <Outlet />;
}
