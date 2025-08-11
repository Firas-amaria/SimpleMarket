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
    <>
      <Header />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: hideSidebar ? "1fr" : "220px 1fr",
          gap: 0,
          alignItems: "start",
        }}
      >
        {!hideSidebar && <Sidebar />}
        <main style={{ padding: "16px" }}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
