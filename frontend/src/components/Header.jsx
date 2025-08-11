import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Sync user across tabs + custom events
  useEffect(() => {
    const updateUserFromStorage = () => {
      try { setUser(JSON.parse(localStorage.getItem("user")) || null); } catch { setUser(null); }
    };
    const onStorage = (e) => { if (e.key === "user") updateUserFromStorage(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("userChanged", updateUserFromStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("userChanged", updateUserFromStorage);
    };
  }, []);

  // Close dropdown on outside click + Escape
  useEffect(() => {
    const handleClickOutside = (evt) => {
      if (dropdownRef.current && !dropdownRef.current.contains(evt.target)) setShowDropdown(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setShowDropdown(false); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = async () => {
    setShowDropdown(false);
    try {
      await api.post("/auth/logout", {}, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    } catch {
      // ignore API errors; clear client state regardless
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("region");
      window.dispatchEvent(new Event("userChanged"));
      navigate("/login", { replace: true });
    }
  };

  const showHomeLeft =
    location.pathname === "/" ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register");

  return (
    <header className="header">
      {/* Left */}
      <div className="header__left">
        {showHomeLeft ? (
          <button
            type="button"
            className="header__homeBtn"
            onClick={() => navigate("/")}
            aria-label="Go to home page"
          >
            Home
          </button>
        ) : (<button
          type="button"
          className="header__title"
          onClick={() => navigate("/market")}
          aria-label="Go to market"
        >
          Welcome to Simple Market
        </button>)}
      </div>

      {/* Center */}
      <div className="header__center">

      </div>

      {/* Right */}
      <div className="header__right">
        {!user ? (
          <div className="header__authBtns">
            <button type="button" className="header__link" onClick={() => navigate("/login")}>
              Login
            </button>
            <button type="button" className="header__link" onClick={() => navigate("/register")}>
              Register
            </button>
          </div>
        ) : (
          <div className="userMenu" ref={dropdownRef}>
            <button
              type="button"
              className="userMenu__button"
              onClick={() => setShowDropdown((p) => !p)}
              aria-haspopup="menu"
              aria-expanded={showDropdown}
            >
              👤 {user.name}
            </button>
            {showDropdown && (
              <div className="userMenu__dropdown" role="menu">
                <button
                  type="button"
                  className="userMenu__item"
                  onClick={() => { setShowDropdown(false); navigate("/profile"); }}
                >
                  Profile
                </button>
                <button type="button" className="userMenu__item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
