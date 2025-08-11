import React, { useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import api from "./utils/api";

import Layout from "./components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Market from "./pages/Market";
import Cart from "./pages/Cart";
import CustomerOrders from "./pages/Orders";
import CustomerOrderDetails from "./pages/OrderDetails";

import ProtectedAdminRoute from "./ProtectedAdminRoute";
import AdminLayout from "./admin/components/AdminLayout";
import Dashboard from "./admin/Dashboard";
import Products from "./admin/Products";
import AdminOrders from "./admin/Orders";
import AdminOrderDetails from "./admin/OrderDetails";
import Users from "./admin/Users";
import Stocks from "./admin/Stocks";

/**
 * Watches for user activity and proactively refreshes the access token
 * when it's within ~60s of expiring. Skips when the tab is hidden.
 */
function SessionKeepAlive() {
  const location = useLocation();
  const lastAttemptRef = useRef(0);

  const REFRESH_THRESHOLD_SEC = 60; // refresh if <= 60s to expire
  const THROTTLE_MS = 15_000; // don't attempt more often than every 15s

  const maybeRefresh = () => {
    // Only refresh when tab is visible (avoid keeping background tabs alive)
    if (document.visibilityState !== "visible") return;

    const now = Date.now();
    if (now - lastAttemptRef.current < THROTTLE_MS) return;
    lastAttemptRef.current = now;

    // Let api.js decide if token is near expiry (<= threshold) and refresh if needed
    api.refreshIfExpiringSoon(REFRESH_THRESHOLD_SEC);
  };

  // On first mount, attempt once (no spam thanks to throttle)
  useEffect(() => {
    maybeRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On route changes, attempt once
  useEffect(() => {
    maybeRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Listen for user interactions
  useEffect(() => {
    const onClick = () => maybeRefresh();
    const onKey = () => maybeRefresh();
    const onPointer = () => maybeRefresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") maybeRefresh();
    };
    const onFocus = () => maybeRefresh();

    window.addEventListener("click", onClick, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function App() {
  return (
    <>
      <SessionKeepAlive />
      <Routes>
        {/* public site */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Index />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="profile" element={<Profile />} />
          <Route path="market" element={<Market />} />
          <Route path="cart" element={<Cart />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="orders/:id" element={<CustomerOrderDetails />} />
        </Route>

        {/* admin area (role-guarded) */}
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetails />} />
            <Route path="users" element={<Users />} />
            <Route path="stocks" element={<Stocks />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
