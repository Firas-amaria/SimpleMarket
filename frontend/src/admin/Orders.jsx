// src/admin/Orders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminListOrders, adminUpdateOrderStatus } from "./scripts/adminApi";

// Full status chain; we treat delivered/cancelled as terminal
const STATUS_CHAIN = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

function getNextStatus(curr) {
  const i = STATUS_CHAIN.indexOf(curr);
  if (i === -1 || i === STATUS_CHAIN.length - 1) return null; // unknown or terminal
  return STATUS_CHAIN[i + 1];
}

function formatMoney(n) {
  if (typeof n !== "number") return "-";
  return `$${n.toFixed(2)}`;
}
function formatDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso || "-"; }
}

export default function AdminOrders() {
  const navigate = useNavigate();

  const [list, setList] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const pages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await adminListOrders({
        status: statusFilter || undefined,
        page,
        limit,
      });
      setList(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      setErr("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const advanceStatus = async (id, currentStatus) => {
    const next = getNextStatus(currentStatus);
    if (!next) return;
    try {
      setUpdatingId(id);
      const updated = await adminUpdateOrderStatus(id, { status: next });
      // Optimistic merge
      setList((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: updated.status, updatedAt: updated.updatedAt } : o))
      );
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="adminOrders">
      <h2>Manage Orders</h2>

      <div className="table-card">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
            >
              <option value="">All statuses</option>
              {STATUS_CHAIN.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
              <option value="cancelled">cancelled</option>
            </select>
          </div>
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
                  <th style={{ whiteSpace: "nowrap" }}>Order #</th>
                  <th>User</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Region</th>
                  <th>Total</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((o) => {
                  const next = getNextStatus(o.status);
                  const itemCount = Array.isArray(o.products) ? o.products.length : 0;
                  return (
                    <tr key={o._id}>
                      <td>{o.orderNumber || o._id}</td>
                      <td>
                        {o.user?.name || o.user?.email || o.user?._id || "—"}
                        {o.user?.email ? ` (${o.user.email})` : ""}
                      </td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>
                        <span className={`badge badge--status status--${o.status}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>{itemCount}</td>
                      <td>{(o.region || "").toUpperCase()}</td>
                      <td>{formatMoney(o.totalAmount)}</td>
                      <td className="ta-right" style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn--ghost btn--sm"
                          onClick={() => navigate(`/admin/orders/${o._id}`)}
                        >
                          View
                        </button>{" "}
                        <button
                          type="button"
                          className="btn--ghost btn--sm"
                          disabled={!next || updatingId === o._id}
                          onClick={() => advanceStatus(o._id, o.status)}
                          title={next ? `Advance to ${next.replace(/_/g, " ")}` : "No further action"}
                        >
                          {next ? `Advance to ${next.replace(/_/g, " ")}` : "—"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan="8" align="center">
                      No orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <span>
              Page {page} / {pages}
            </span>
            <button
              className="page-btn"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
