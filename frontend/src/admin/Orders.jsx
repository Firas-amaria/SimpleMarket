// src/admin/Orders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminListOrders,
  adminAdvanceOrderStatus,
  adminAdvanceManyOrderStatuses,
  adminCancelOrder,
} from "./scripts/adminApi";

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
function isTerminal(s) {
  return s === "delivered" || s === "cancelled";
}
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

export default function AdminOrders() {
  const navigate = useNavigate();

  const [list, setList] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false); // covers row + bulk actions
  const [selected, setSelected] = useState(() => new Set());

  const pages = useMemo(() => Math.ceil(total / limit), [total, limit]);
  const allIdsOnPage = useMemo(() => list.map((o) => o._id), [list]);
  const allSelectedOnPage = useMemo(
    () => allIdsOnPage.length > 0 && allIdsOnPage.every((id) => selected.has(id)),
    [allIdsOnPage, selected]
  );

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
      // Clean up any selections that are not on this page anymore
      setSelected((prev) => {
        const next = new Set([...prev].filter((id) => (res.items || []).some((o) => o._id === id)));
        return next;
      });
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

  const toggleSelect = (id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = (checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of allIdsOnPage) next.add(id);
      } else {
        for (const id of allIdsOnPage) next.delete(id);
      }
      return next;
    });
  };

  const doAdvanceOne = async (id) => {
    try {
      setBusy(true);
      const { order, nextStatus } = await adminAdvanceOrderStatus(id);
      // Merge the updated order status into the table
      setList((prev) =>
        prev.map((o) =>
          o._id === id ? { ...o, status: order.status, updatedAt: order.updatedAt } : o
        )
      );
      // If the filter hides the new status, consider reloading
      if (statusFilter && order.status !== statusFilter) {
        await load();
      }
      return nextStatus;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 409
          ? "Order status changed; refreshing list…"
          : "Failed to advance order");
      alert(msg);
      if (e?.response?.status === 409) await load();
      return null;
    } finally {
      setBusy(false);
    }
  };

  const doCancelOne = async (id) => {
    const reason = window.prompt("Cancel order - optional reason:", "");
    if (reason === null) return; // cancelled prompt
    try {
      setBusy(true);
      const { order } = await adminCancelOrder(id, reason);
      setList((prev) =>
        prev.map((o) =>
          o._id === id ? { ...o, status: order.status, updatedAt: order.updatedAt } : o
        )
      );
      if (statusFilter && order.status !== statusFilter) {
        await load();
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 409
          ? "Order already terminal; refreshing list…"
          : "Failed to cancel order");
      alert(msg);
      if (e?.response?.status === 409) await load();
    } finally {
      setBusy(false);
    }
  };

  const bulkAdvance = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Advance ${ids.length} selected order(s) by one step?`)) return;

    try {
      setBusy(true);
      const res = await adminAdvanceManyOrderStatuses(ids);
      const okSet = new Set(res.ok || []);
      // Optimistically update rows we know advanced
      setList((prev) =>
        prev.map((o) => {
          if (!okSet.has(o._id)) return o;
          const next = getNextStatus(o.status);
          return next ? { ...o, status: next, updatedAt: new Date().toISOString() } : o;
        })
      );
      // If some skipped or statusFilter excludes new states, reload
      if ((res.skipped && res.skipped.length) || statusFilter) {
        await load();
      }
      alert(`Advanced: ${res.ok?.length || 0}. Skipped: ${res.skipped?.length || 0}.`);
      // Clear selection after bulk action
      setSelected(new Set());
    } catch (e) {
      alert(e?.response?.data?.message || "Bulk advance failed");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adminOrders">
      <h2>Manage Orders</h2>

      <div className="table-card">
        {/* Toolbar */}
        <div className="table-toolbar" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={allSelectedOnPage}
                onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                aria-label="Select all on page"
              />
              <span style={{ marginLeft: 6 }}>Select page</span>
            </label>
          </div>

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

          <div style={{ flex: 1 }} />

          <button
            type="button"
            className="btn--ghost btn--sm"
            disabled={busy || selected.size === 0}
            onClick={bulkAdvance}
            title="Advance selected orders by one step"
          >
            Advance selected
          </button>
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
                  <th>
                    {/* per-row selection column header kept simple; bulk checkbox is in toolbar */}
                    #
                  </th>
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
                  const isSel = selected.has(o._id);
                  const rowTerminal = isTerminal(o.status);
                  return (
                    <tr key={o._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={(e) => toggleSelect(o._id, e.target.checked)}
                          aria-label={`Select order ${o.orderNumber || o._id}`}
                        />
                      </td>
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
                          disabled={!next || busy}
                          onClick={() => doAdvanceOne(o._id)}
                          title={next ? `Advance to ${next.replace(/_/g, " ")}` : "No further action"}
                        >
                          {next ? `Advance to ${next.replace(/_/g, " ")}` : "—"}
                        </button>{" "}
                        <button
                          type="button"
                          className="btn--ghost btn--sm"
                          disabled={rowTerminal || busy}
                          onClick={() => doCancelOne(o._id)}
                          title={rowTerminal ? "Already terminal" : "Cancel this order"}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan="9" align="center">
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
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <span>
              Page {page} / {pages}
            </span>
            <button
              className="page-btn"
              disabled={page >= pages || busy}
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
