// src/components/Sidebar.jsx
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { itemCount } from "../utils/cart";

export default function Sidebar() {
  const [count, setCount] = useState(() => itemCount());

  useEffect(() => {
    const update = () => setCount(itemCount());
    window.addEventListener("cartChanged", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cartChanged", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <nav className="sidebar__nav">
        <NavLink to="/market" className={({ isActive }) => `sidebar__link ${isActive ? "is-active" : ""}`}>
          <span className="sidebar__icon" aria-hidden>🛍️</span>
          <span className="sidebar__text">Market</span>
        </NavLink>

        <NavLink to="/cart" className={({ isActive }) => `sidebar__link ${isActive ? "is-active" : ""}`}>
          <span className="sidebar__icon" aria-hidden>🛒</span>
          <span className="sidebar__text">Cart</span>
          {!!count && <span className="sidebar__badge">{count}</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
