// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";
import ImageInput from "../components/ImageInput";

function readLocalUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function Profile() {
  const localUser = readLocalUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    name: localUser?.name || "",
    region: (localUser?.region || "").toLowerCase(), // read-only display
    profileImage: localUser?.profileImage || "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/user/getMyProfile");
        const u = res.data?.user || null;
        if (u && alive) {
          setForm({
            name: u.name || "",
            region: (u.region || "").toLowerCase(),
            profileImage: u.profileImage || "",
          });
        }
      } catch {
        /* ignore, fall back to local */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!form.name.trim()) {
      return setErr("Name cannot be empty");
    }

    setSaving(true);
    try {
      // Do NOT send region
      const res = await api.put("/user/updateMyProfile", {
        name: form.name.trim(),
        profileImage: form.profileImage ?? "",
      });
      const updated = res.data?.user || null;

      if (updated) {
        localStorage.setItem("user", JSON.stringify(updated));
        // keep region in localStorage in sync with server value (unchanged here)
        if (updated.region) {
          localStorage.setItem("region", String(updated.region).toLowerCase());
        }
        window.dispatchEvent(new Event("userChanged"));
      }

      setOk("Profile updated!");
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e2?.message ||
        "Update failed. Please try again.";
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="market__loading">Loading profile…</div>;

  return (
    <div className="cart" style={{ maxWidth: 600 }}>
      <h2>Edit Profile</h2>

      <form onSubmit={onSubmit} className="card">
        <h3>Identity</h3>

        <label>
          Name
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Your name"
            required
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <h3>Profile Picture</h3>
          <ImageInput
            value={form.profileImage}
            onChange={(url) => setForm((f) => ({ ...f, profileImage: url }))}
            options={{ folder: "avatars" }}
          />
          <div className="muted" style={{ marginTop: 8 }}>
            Tip: Drop an image or click the box to upload. Leave empty to remove your avatar.
          </div>
        </div>

        {err && <div className="market__error" style={{ marginTop: 12 }}>{err}</div>}
        {ok && <div className="toast" style={{ marginTop: 12 }}>{ok}</div>}

        <div className="actions">
          <button type="button" className="btn--ghost" onClick={() => window.history.back()}>
            Back
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
