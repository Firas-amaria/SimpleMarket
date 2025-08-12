// src/admin/Stocks.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  adminListStocks,
  adminCreateStock,
  adminUpdateStockQty,
  adminDeleteStock,
  adminListProducts,
} from "./scripts/adminApi";

const REGIONS = ["east", "west"];

/** ===== Unit helpers (canonical = grams) ===== */
const SNAP_STEP_G = 50;
function snap50(g) {
  const n = Number(g || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n / SNAP_STEP_G) * SNAP_STEP_G);
}
function kgToG(kg) {
  const n = Number(kg || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return snap50(Math.round(n * 1000));
}
function gToKgParts(g) {
  const total = snap50(Number(g || 0));
  const kg = Math.floor(total / 1000);
  const grams = total - kg * 1000; // always < 1000, multiple of 50
  return { kg, g: grams };
}

export default function AdminStocks() {
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Create form (kg only)
  const [newProductId, setNewProductId] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [newQtyKg, setNewQtyKg] = useState(""); // allow decimals (0.05 = 50g)
  const [adding, setAdding] = useState(false);

  // Per-row pending edits in grams (id -> grams)
  const [pending, setPending] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setErr("");
    try {
      const [stockRes, prodRes] = await Promise.all([
        adminListStocks(),        // { items: Stock[] }
        adminListProducts({}),    // { items: Product[] }
      ]);
      setStocks(stockRes.items || []);
      setProducts(prodRes.items || []);
      setPending({}); // clear local pending delta after reload
    } catch (e) {
      console.error(e);
      setErr("Failed to load stocks or products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const productOptions = useMemo(() => {
    return (products || []).map((p) => ({ value: p._id, label: p.name }));
  }, [products]);

  /** -------- Create stock (kg -> g) -------- */
  const handleAddStock = async () => {
    if (!newProductId || !newRegion) {
      alert("Select product and region");
      return;
    }
    const grams = kgToG(newQtyKg);
    setAdding(true);
    try {
      const created = await adminCreateStock({
        productId: newProductId,
        region: String(newRegion).toLowerCase(),
        quantity: grams,
      });
      // optimistic prepend, but then reload for consistency
      setStocks((prev) => [created, ...prev]);
      setNewProductId("");
      setNewRegion("");
      setNewQtyKg("");
      await loadData();
    } catch (e) {
      if (e?.response?.status === 409) {
        alert("Stock for this product and region already exists");
      } else {
        alert(e?.response?.data?.message || "Failed to create stock");
      }
    } finally {
      setAdding(false);
    }
  };

  /** -------- Per-row helpers -------- */
  const getRowServerQty = (id) =>
    snap50(stocks.find((s) => s._id === id)?.quantity ?? 0);
  const getRowPendingQty = (id) => {
    const p = pending[id];
    return p == null ? getRowServerQty(id) : snap50(p);
  };

  const bumpPending = (id, deltaG) => {
    setPending((prev) => {
      const base = getRowPendingQty(id);
      const next = snap50(base + deltaG);
      return { ...prev, [id]: Math.max(0, next) };
    });
  };

  const handleSaveRow = async (id) => {
    const current = getRowServerQty(id);
    const next = getRowPendingQty(id);
    if (next === current) return; // nothing to save
    setSavingId(id);
    try {
      const updated = await adminUpdateStockQty(id, { quantity: next });
      setStocks((prev) => prev.map((s) => (s._id === id ? updated : s)));
      setPending((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update quantity");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteStock = async (id) => {
    if (!window.confirm("Delete this stock entry?")) return;
    setDeletingId(id);
    try {
      await adminDeleteStock(id);
      setStocks((prev) => prev.filter((s) => s._id !== id));
      setPending((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete stock");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h2>Manage Stocks</h2>

      <div className="table-card">
        {/* Toolbar (Create) */}
        <div className="table-toolbar" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            className="select"
            value={newProductId}
            onChange={(e) => setNewProductId(e.target.value)}
          >
            <option value="">Select product</option>
            {productOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className="select"
            value={newRegion}
            onChange={(e) => setNewRegion(String(e.target.value).toLowerCase())}
          >
            <option value="">Select region</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <input
            className="input"
            type="number"
            min="0"
            step="0.05" // 50 g steps
            value={newQtyKg}
            placeholder="Quantity (kg)"
            onChange={(e) => setNewQtyKg(e.target.value)}
            style={{ width: 140 }}
          />

          <button className="btn" onClick={handleAddStock} disabled={adding}>
            {adding ? "Adding…" : "+ Add Stock"}
          </button>
        </div>

        <div className="table-hint" style={{ padding: "4px 12px", opacity: 0.8 }}>
          Quantities are stored in grams. Displayed as kg + g (snapped to 50 g). Row changes use buttons; click <strong>Save</strong> to apply.
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 16 }}>Loading…</div>
          ) : err ? (
            <div style={{ padding: 16 }}>{err}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Region</th>
                  <th>Quantity</th>
                  <th>Adjust</th>
                  <th>Created</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => {
                  const curr = getRowServerQty(s._id);
                  const pend = getRowPendingQty(s._id);
                  const { kg, g } = gToKgParts(pend);
                  const dirty = pend !== curr;

                  return (
                    <tr key={s._id}>
                      <td>
                        {s.productId?.image && (
                          <img
                            src={s.productId.image}
                            alt={s.productId.name}
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: "cover",
                              borderRadius: 4,
                              marginRight: 8,
                              verticalAlign: "middle",
                            }}
                          />
                        )}
                        {s.productId?.name || "Unknown Product"}
                      </td>

                      <td>{s.region}</td>

                      <td>
                        <div title={`${pend} g`}>
                          <strong>{kg}</strong> kg{" "}
                          <span>{g} g</span>
                          {dirty && <em style={{ marginLeft: 8, opacity: 0.7 }}>(unsaved)</em>}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            className="btn--ghost btn--sm"
                            onClick={() => bumpPending(s._id, 100000)} // +100 kg
                            disabled={savingId === s._id || deletingId === s._id}
                          >
                            +100 kg
                          </button>
                          <button
                            className="btn--ghost btn--sm"
                            onClick={() => bumpPending(s._id, 10000)} // +10 kg
                            disabled={savingId === s._id || deletingId === s._id}
                          >
                            +10 kg
                          </button>
                          <button
                            className="btn--ghost btn--sm"
                            onClick={() => bumpPending(s._id, 1000)} // +1 kg
                            disabled={savingId === s._id || deletingId === s._id}
                          >
                            +1 kg
                          </button>
                          <button
                            className="btn--ghost btn--sm"
                            onClick={() => bumpPending(s._id, 100)} // +100 g
                            disabled={savingId === s._id || deletingId === s._id}
                          >
                            +100 g
                          </button>
                        </div>
                      </td>

                      <td>{new Date(s.createdAt).toLocaleDateString()}</td>

                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className="btn"
                            disabled={!dirty || savingId === s._id || deletingId === s._id}
                            onClick={() => handleSaveRow(s._id)}
                            title={dirty ? `Save ${kg} kg ${g} g` : "No changes"}
                          >
                            {savingId === s._id ? "Saving…" : "Save"}
                          </button>
                          <button
                            className="btn secondary"
                            onClick={() => handleDeleteStock(s._id)}
                            disabled={savingId === s._id || deletingId === s._id}
                          >
                            {deletingId === s._id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {stocks.length === 0 && (
                  <tr>
                    <td colSpan="6" align="center">
                      No stock entries
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
