// src/pages/Market.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRegion, setRegion, listRegionsCached } from "../utils/region";
import { fetchProducts } from "../utils/marketApi";
import { clearIfStale, addItem } from "../utils/cart";
import { useToast } from "../components/ToastProvider";

// Single-select categories (can move to a constants file later)
const CATEGORY_OPTIONS = [
  { value: "vegetables", label: "Vegetables" },
  { value: "fruits", label: "Fruits" },
  { value: "herbs", label: "Herbs" },
  { value: "other", label: "Other" },
];

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function Market() {
  const navigate = useNavigate();
  const toast = useToast(); 

  // Require login to access Market
  const user = readUser();
  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  // Region decision:
  // - Logged-in: force to user.region (locked)
  // - Otherwise: from localStorage (guest flow), but your app requires login anyway
  const userRegion = user?.region ? String(user.region).toLowerCase() : null;

  const [region, setRegionState] = useState(() => {
    if (userRegion) {
      setRegion(userRegion); // keep localStorage in sync with authoritative user region
      return userRegion;
    }
    return getRegion();
  });

  const [q, setQ] = useState("");
  const [category, setCategory] = useState(""); // "" = all
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const regions = useMemo(() => listRegionsCached(), []);

  // 7-day cart expiry check on entry
  useEffect(() => {
    clearIfStale();
  }, []);

  // For guests (if any), allow choosing region; for logged-in users, ignore (locked)
  const handleChooseRegion = (r) => {
    if (userRegion) return; // locked when logged in
    try {
      setRegion(r);
      setRegionState(r);
      setPage(1);
    } catch (e) {
      alert(e.message || "Invalid region");
    }
  };

  // Load products whenever filters change
  useEffect(() => {
    if (!region) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await fetchProducts({
          region,
          page,
          q,
          inStock: true,
          category: category || undefined,
        });
        if (!alive) return;
        setList(data.items || []);
        setPages(data.pages || 1);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message || "Failed to load products");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [region, page, q, category]);

  // ---- Product card ----
  const ProductCard = ({ p }) => {
    const MIN_G = 50;
    const STEP_G = 50;
    const MAX_G = 5000;

    const [grams, setGrams] = useState(200);

    const clampToStep = (val) => {
      if (!Number.isFinite(val)) return 200;
      const rounded = Math.round(val / STEP_G) * STEP_G;
      return Math.min(MAX_G, Math.max(MIN_G, rounded));
    };

    const dec = () => setGrams((g) => Math.max(MIN_G, g - STEP_G));
    const inc = () => setGrams((g) => Math.min(MAX_G, g + STEP_G));
    const onInputChange = (e) => {
      const v = Number(e.target.value);
      setGrams(clampToStep(v));
    };

    const onAdd = () => {
      addItem(p._id, grams);
      // TODO: optional toast/snackbar: e.g., "Added 200g of Tomatoes"
      toast(`Added ${grams}g of ${p.name} to cart`);

    };

    return (
      <div className="productCard">
        <div
          className={`productCard__image ${p.image ? "" : "is-placeholder"}`}
          style={p.image ? { backgroundImage: `url(${p.image})` } : undefined}
        />
        <div className="productCard__name">{p.name}</div>
        <div className="productCard__desc">{p.description || ""}</div>

        {/* Quantity control */}
        <div className="qty">
          <button
            type="button"
            className="qty__btn"
            onClick={dec}
            aria-label="Decrease by 50 grams"
          >
            −
          </button>
          <input
            className="qty__input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={grams}
            onChange={onInputChange}
            aria-label="Amount in grams"
          />
          <span className="qty__unit">g</span>
          <button
            type="button"
            className="qty__btn"
            onClick={inc}
            aria-label="Increase by 50 grams"
          >
            ＋
          </button>
        </div>

        <div className="productCard__footer">
          {/* Adjust label per your pricing unit; leaving "/ 100 gram" as you set */}
          <span className="productCard__price">
            ${Number(p.price).toFixed(2)} / 100 gram
          </span>
          <button type="button" className="btn--ghost" onClick={onAdd}>
            Add
          </button>
        </div>
      </div>
    );
  };

  // If no region (guest with missing/invalid region), show gate
  if (!region) {
    return (
      <div className="regionGate">
        <h2 className="regionGate__title">Please choose your region</h2>
        <p className="regionGate__subtitle">
          We only show products available in your area.
        </p>
        <div className="regionGate__choices">
          {regions.map((r) => (
            <button
              key={r}
              type="button"
              className="btn--ghost"
              onClick={() => handleChooseRegion(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="regionGate__back"
          onClick={() => navigate("/")}
        >
          Back to Home
        </button>
      </div>
    );
  }

  const regionLocked = !!userRegion;

  return (
    <div className="market">
      <div className="market__top">
        <h2 className="market__title">
          Market — Region:{" "}
          <span className="badge badge--region">{region.toUpperCase()}</span>
          {regionLocked && (
            <span className="badge badge--lock" title="Region locked to your profile">
              🔒
            </span>
          )}
        </h2>

        <div className="market__controls">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search products..."
            className="market__search"
          />

          <select
            className="market__select"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {!regionLocked && (
            <button
              type="button"
              className="btn--ghost"
              onClick={() => {
                if (!regions.length) return;
                const i = Math.max(0, regions.indexOf(region));
                const next = regions[(i + 1) % regions.length];
                handleChooseRegion(next);
              }}
            >
              Switch Region
            </button>
          )}
        </div>
      </div>

      {err && <div className="market__error">{err}</div>}

      {loading ? (
        <div className="market__loading">Loading…</div>
      ) : (
        <>
          <div className="market__grid">
            {list.map((p) => (
              <ProductCard key={p._id} p={p} />
            ))}
          </div>

          {pages > 1 && (
            <div className="market__pagination">
              <button
                type="button"
                className="btn--ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className="market__pageInfo">
                Page {page} / {pages}
              </span>
              <button
                type="button"
                className="btn--ghost"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
