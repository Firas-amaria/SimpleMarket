// src/admin/OrderDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminGetOrderById, adminUpdateOrderStatus } from "./scripts/adminApi";

const STATUS_CHAIN = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"];
const nextStatus = (s) => {
  const i = STATUS_CHAIN.indexOf(s);
  return i >= 0 && i < STATUS_CHAIN.length - 1 ? STATUS_CHAIN[i + 1] : null;
};

function formatMoney(n) {
  if (typeof n !== "number") return "-";
  return `$${n.toFixed(2)}`;
}
function formatDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso || "-"; }
}

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await adminGetOrderById(id);
        if (!alive) return;
        setOrder(data);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message || "Failed to load order");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
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
    const ns = nextStatus(order.status);
    if (!ns) return;
    try {
      setUpdating(true);
      const updated = await adminUpdateOrderStatus(order._id, { status: ns });
      setOrder((o) => ({ ...o, status: updated.status, updatedAt: updated.updatedAt, statusTimestamps: updated.statusTimestamps || o.statusTimestamps }));
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="orderDetails">
      <div className="orderDetails__top">
        <button type="button" className="btn--ghost" onClick={() => navigate(-1)}>← Back</button>
        <h2 className="orderDetails__title">Order <span className="orderDetails__code">{order?.orderNumber || id}</span></h2>
        <div />
      </div>

      {err && <div className="market__error">{err}</div>}
      {loading && <div className="market__loading">Loading…</div>}

      {!loading && order && (
        <>
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
                  <span className={`badge badge--status status--${order.status}`}>{order.status.replace(/_/g, " ")}</span>
                </div>
              </div>
              <div className="metaRow">
                <div className="metaLabel">Total</div>
                <div className="metaValue metaValue--strong">{formatMoney(order.totalAmount)}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn--ghost"
                disabled={!nextStatus(order.status) || updating}
                onClick={onAdvance}
              >
                {nextStatus(order.status) ? `Advance to ${nextStatus(order.status).replace(/_/g, " ")}` : "No further action"}
              </button>
            </div>
          </section>

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
                    <tr key={order._id + idx}>
                      <td>{it?.product?.name || it?.product?._id || "Item"}</td>
                      <td>{Number(it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

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
