// src/admin/OrderDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  adminGetOrderById,
  adminAdvanceOrderStatus,
  adminCancelOrder,
} from "./scripts/adminApi";

const STATUS_CHAIN = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"];

function nextStatus(s) {
  const i = STATUS_CHAIN.indexOf(s);
  return i >= 0 && i < STATUS_CHAIN.length - 1 ? STATUS_CHAIN[i + 1] : null;
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

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false); // covers advance/cancel operations

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await adminGetOrderById(id);
      setOrder(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const timeline = useMemo(() => {
    const m = order?.statusTimestamps || {};
    const obj = m instanceof Map ? Object.fromEntries(m.entries()) : m;
    const arr = Object.entries(obj).map(([status, at]) => ({ status, at }));
    if (order?.createdAt && !arr.some((e) => e.status === "created")) {
      arr.push({ status: "created", at: order.createdAt });
    }
    arr.sort((a, b) => new Date(a.at) - new Date(b.at));
    return arr;
  }, [order]);

  const onAdvance = async () => {
    if (!order || isTerminal(order.status)) return;
    try {
      setBusy(true);
      const { order: updated } = await adminAdvanceOrderStatus(order._id);
      setOrder((prev) => ({
        ...(prev || {}),
        ...updated,
        status: updated.status,
        updatedAt: updated.updatedAt,
        statusTimestamps: updated.statusTimestamps || prev?.statusTimestamps,
      }));
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 409
          ? "Order status changed by another process. Refreshing…"
          : "Failed to advance order");
      alert(msg);
      await load(); // re-sync if race/other error
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    if (!order || isTerminal(order.status)) return;
    const reason = window.prompt("Cancel order — optional reason:", "");
    if (reason === null) return; // user cancelled prompt
    try {
      setBusy(true);
      const { order: updated } = await adminCancelOrder(order._id, reason);
      setOrder((prev) => ({
        ...(prev || {}),
        ...updated,
        status: updated.status,
        updatedAt: updated.updatedAt,
        statusTimestamps: updated.statusTimestamps || prev?.statusTimestamps,
      }));
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 409
          ? "Order already terminal. Refreshing…"
          : "Failed to cancel order");
      alert(msg);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const canAdvance = order && !isTerminal(order.status) && nextStatus(order.status);
  const canCancel = order && !isTerminal(order.status);

  return (
    <div className="orderDetails">
      <div className="orderDetails__top">
        <button type="button" className="btn--ghost" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="orderDetails__title">
          Order <span className="orderDetails__code">{order?.orderNumber || id}</span>
        </h2>
        <div className="orderDetails__actions" style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn--ghost btn--sm"
            disabled={!canAdvance || busy}
            onClick={onAdvance}
            title={canAdvance ? `Advance to ${nextStatus(order.status).replace(/_/g, " ")}` : "No further action"}
          >
            {canAdvance ? `Advance to ${nextStatus(order.status).replace(/_/g, " ")}` : "No further action"}
          </button>
          <button
            type="button"
            className="btn--ghost btn--sm"
            disabled={!canCancel || busy}
            onClick={onCancel}
            title={canCancel ? "Cancel this order" : "Already terminal"}
          >
            Cancel
          </button>
        </div>
      </div>

      {err && <div className="market__error">{err}</div>}
      {loading && <div className="market__loading">Loading…</div>}

      {!loading && order && (
        <>
          {/* Meta panel */}
          <section className="orderDetails__section">
            <div className="orderDetails__meta">
              <div className="metaRow">
                <div className="metaLabel">User</div>
                <div className="metaValue">{order.user?.name || order.user?.email || order.user?._id || "—"}</div>
              </div>
              <div className="metaRow">
                <div className="metaLabel">Email</div>
                <div className="metaValue">{order.user?.email || "—"}</div>
              </div>
              <div className="metaRow">
                <div className="metaLabel">Region</div>
                <div className="metaValue">{(order.region || "").toUpperCase()}</div>
              </div>
              <div className="metaRow">
                <div className="metaLabel">Created</div>
                <div className="metaValue">{formatDate(order.createdAt)}</div>
              </div>
              <div className="metaRow">
                <div className="metaLabel">Updated</div>
                <div className="metaValue">{formatDate(order.updatedAt)}</div>
              </div>
              <div className="metaRow">
                <div className="metaLabel">Status</div>
                <div className="metaValue">
                  <span className={`badge badge--status status--${order.status}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <div className="metaRow">
                <div className="metaLabel">Total</div>
                <div className="metaValue metaValue--strong">{formatMoney(order.totalAmount)}</div>
              </div>
            </div>
          </section>

          {/* Items table */}
          <section className="orderDetails__section">
            <h3 className="orderDetails__subtitle">Items</h3>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.products || []).map((it, idx) => (
                    <tr key={(it?.product?._id || it?.product || "row") + idx}>
                      <td>{it?.product?.name || it?.product?._id || "Item"}</td>
                      <td>{Number(it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Status timeline */}
          <section className="orderDetails__section">
            <h3 className="orderDetails__subtitle">Status timeline</h3>
            {timeline.length ? (
              <ul className="orderDetails__timeline">
                {timeline.map((e, i) => (
                  <li key={i} className="timelineItem">
                    <span className={`timelineDot status--${e.status}`} aria-hidden />
                    <div className="timelineContent">
                      <div className="timelineStatus">{e.status.replace(/_/g, " ")}</div>
                      <div className="timelineWhen">{formatDate(e.at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="orders__empty">No status history yet.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
