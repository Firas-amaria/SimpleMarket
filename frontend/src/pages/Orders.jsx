import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import { listMyOrders } from "../utils/marketApi";

// Statuses considered "active"
const ACTIVE_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
];

const REFRESH_MS = 30_000; // auto-refresh every 30s

function formatMoney(n) {
  if (typeof n !== "number") return "-";
  return `$${n.toFixed(2)}`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || "-";
  }
}

export default function Orders() {
  const navigate = useNavigate();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  // One function to load all pages
  const loadAll = async ({ isBackground = false } = {}) => {
    try {
      if (isBackground) setRefreshing(true);
      else setLoading(true);

      setErr("");
      const acc = [];
      let page = 1;
      let pages = 1;
      const LIMIT = 20;

      while (page <= pages) {
        const res = await listMyOrders({ page, limit: LIMIT });
        acc.push(...(res.items || []));
        pages = res.pages || 1;
        page += 1;
      }

      acc.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(acc);
    } catch (e) {
      const message =
        e?.response?.data?.message || e.message || "Failed to load orders";
      setErr(message);
      // On initial load, show toast; on background refresh, avoid spam
      if (!isBackground) toast(message);
    } finally {
      if (isBackground) setRefreshing(false);
      else setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await loadAll({ isBackground: false });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 30s when tab is visible
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      loadAll({ isBackground: true });
    };
    const id = setInterval(tick, REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { activeOrders, historyOrders } = useMemo(() => {
    const active = [];
    const history = [];
    for (const o of orders) {
      if (ACTIVE_STATUSES.includes(o.status)) active.push(o);
      else history.push(o);
    }
    return { activeOrders: active, historyOrders: history };
  }, [orders]);

  const renderTable = (rows) => {
    if (!rows.length) return <div className="orders__empty">No orders.</div>;

    return (
      <div className="tableWrap">
        <table className="table" role="table">
          <thead>
            <tr>
              <th style={{ whiteSpace: "nowrap" }}>Order #</th>
              <th>Created</th>
              <th>Status</th>
              <th>Items</th>
              <th>Region</th>
              <th>Total</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o._id}>
                <td>{o.orderNumber || o._id}</td>
                <td>{formatDate(o.createdAt)}</td>
                <td>
                  <span
                    className={`badge badge--status status--${o.status}`}
                    title={o.status.replace(/_/g, " ")}
                  >
                    {o.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td>{Array.isArray(o.products) ? o.products.length : 0}</td>
                <td>{(o.region || "").toUpperCase()}</td>
                <td>{formatMoney(o.totalAmount)}</td>
                <td className="ta-right">
                  <button
                    type="button"
                    className="btn--ghost btn--sm"
                    onClick={() => navigate(`/orders/${o._id}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {refreshing && (
          <div className="table__refreshHint">Refreshing…</div>
        )}
      </div>
    );
  };

  const showNoOrdersCTA = !loading && !err && orders.length === 0;

  return (
    <div className="orders">
      <div className="orders__top">
        <h2 className="orders__title">My Orders</h2>
        <div className="orders__hint">Auto-refresh every 30s</div>
      </div>

      {err && <div className="market__error">{err}</div>}
      {loading && <div className="market__loading">Loading…</div>}

      {showNoOrdersCTA && (
        <div className="orders__emptyRow">
          <div>No orders yet.</div>
          <button
            type="button"
            className="btn--ghost"
            onClick={() => navigate("/market")}
          >
            Go to Market
          </button>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <>
          <section className="orders__section">
            <h3 className="orders__subtitle">Active Order</h3>
            {renderTable(activeOrders)}
          </section>

          <section className="orders__section">
            <h3 className="orders__subtitle">Order History</h3>
            {renderTable(historyOrders)}
          </section>
        </>
      )}
    </div>
  );
}
