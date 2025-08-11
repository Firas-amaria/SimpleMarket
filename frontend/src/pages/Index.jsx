// src/pages/Index.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Optional: paste your Cloudinary hero URL later
// const HERO_IMAGE_URL = "https://res.cloudinary.com/<cloud>/image/upload/v....jpg";
const HERO_IMAGE_URL = "";

// tiny helper: decode JWT payload safely
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const json = atob(base64Url.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function isTokenValid(token) {
  if (!token) return false;
  const payload = parseJwt(token);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 < Date.now()) return false;
  return true;
}

export default function Index() {
  const navigate = useNavigate();

  // Auto-redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    const valid = isTokenValid(token);

    if (!valid) return; // stay on welcome

    // prefer role from user in storage, fallback to token payload
    let role = null;
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      role = u?.role || null;
    } catch {
      role = null;
    }
    if (!role) {
      const payload = parseJwt(token);
      role = payload?.role || null;
    }

    if (role === "admin") navigate("/admin/dashboard", { replace: true });
    else navigate("/market", { replace: true });
  }, [navigate]);

  const handleGetStarted = () => {
    // If not logged in, go to login; if logged in, effect above will redirect
    const token = localStorage.getItem("token") || "";
    if (!isTokenValid(token)) return navigate("/login");
    // otherwise do nothing; the effect will handle redirect
  };

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", minHeight: "70vh" }}>
      {/* Hero / image area */}
      <div
        style={{
          height: 280,
          background: HERO_IMAGE_URL ? `center / cover no-repeat url(${HERO_IMAGE_URL})` : "#f3f4f6",
          borderRadius: 12,
          margin: "24px auto 0",
          width: "min(1100px, 92%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: 14,
        }}
        aria-label="Welcome image"
      >
        {!HERO_IMAGE_URL && "Add your Cloudinary hero image here"}
      </div>

      {/* Copy + CTA */}
      <section style={{ width: "min(900px, 92%)", margin: "24px auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, margin: "8px 0 4px" }}>Welcome to Simple Market</h1>
        <p style={{ color: "#4b5563", margin: "0 0 18px" }}>
          Fresh fruits and vegetables, sourced locally and delivered to your region.
          Sign in to browse the market, manage your cart, and track your orders.
        </p>

        <button
          type="button"
          onClick={handleGetStarted}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            background: "black",
            color: "white",
          }}
        >
          Let’s get started
        </button>

        <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
          (We’ll take you to login if you’re new. If you’re signed in, we’ll send you to your dashboard.)
        </div>
      </section>
    </div>
  );
}
