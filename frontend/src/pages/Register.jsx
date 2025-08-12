// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const CANON_REGIONS = ["east", "west"];

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    region: "", // ← no default from localStorage
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onChange = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validations
    if (!form.name.trim() || !form.email.trim()) {
      return setError("Name and email are required.");
    }
    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }
    const region = (form.region || "").toLowerCase().trim();
    if (!CANON_REGIONS.includes(region)) {
      return setError("Please select a valid region (east/west).");
    }

    try {
      setSubmitting(true);

      // IMPORTANT: backend register() only accepts name, email, password
      await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        // region is intentionally NOT sent because your controller ignores it
      });

      // Keep the storefront in sync client-side for now.
      // (This does NOT prefill the register form; it just helps the rest of the app.)
      localStorage.setItem("region", region);

      alert("Registered! Now log in.");
      navigate("/login");
    } catch (err) {
      // Try to surface a useful message if the API sends one (e.g., 409 email in use)
      const msg =
        err?.response?.data?.message ||
        "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Register</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={onChange("name")}
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={onChange("email")}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={onChange("password")}
          required
          minLength={6}
        />
        <input
          placeholder="Confirm Password"
          type="password"
          value={form.confirmPassword}
          onChange={onChange("confirmPassword")}
          required
          minLength={6}
        />

        <label>
          Region
          <select
            value={form.region}
            onChange={(e) =>
              setForm((f) => ({ ...f, region: e.target.value.toLowerCase() }))
            }
            required
          >
            <option value="">Select...</option>
            <option value="east">East</option>
            <option value="west">West</option>
          </select>
        </label>
      </div>

      {error && (
        <div style={{ color: "crimson", marginTop: 12 }} role="alert">
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button type="button" onClick={() => navigate("/login")}>
          Already have an account? Login
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? "Registering…" : "Register"}
        </button>
      </div>
    </form>
  );
}
