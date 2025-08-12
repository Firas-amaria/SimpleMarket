// src/components/Layout.jsx
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "../index.css";

export default function Layout() {
  const location = useLocation();
  const path = location.pathname;

  // Pages where we do NOT show the sidebar
  const hideSidebar =
    path === "/" || path.startsWith("/login") || path.startsWith("/register");

  return (
    <div className="appShell">
      <Header />

      <div
        className="shellBody"
        style={{
          display: "grid",
          gridTemplateColumns: hideSidebar ? "1fr" : "240px 1fr",
          gap: 0,
          alignItems: "stretch",
          overflow: "hidden", // important: block page scroll, main will scroll
        }}
      >
        {!hideSidebar && <Sidebar />}

        <main className="pageMain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
