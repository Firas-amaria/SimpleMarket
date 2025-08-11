import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import { getMyOrderById, getProductById } from "../utils/marketApi";

function formatMoney(n) {
  if (typeof n !== "number") return "-";
  return `$${n.toFixed(2)}`;
}
function formatDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso || "-"; }
}

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [names, setNames] = useState({}); // productId -> productName
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await getMyOrderById(id);
        if (!alive) return;

        setOrder(data);

        // Prefetch product names (order stores only product ids/qty)
        const ids = Array.from(
          new Set((data.products || []).map((p) => String(p.product)))
        );
        const pairs = await Promise.all(
          ids.map(async (pid) => {
            try {
              const p = await getProductById(pid);
              return [pid, p?.name || pid];
            } catch {
              return [pid, pid];
            }
          })
        );
        if (!alive) return;
        const map = {};
        for (const [k, v] of pairs) map[k] = v;
        setNames(map);
      } catch (e) {
        if (!alive) return;
        const message = e?.response?.data?.message || e.message || "Failed to load order";
        setErr(message);
        toast(message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, toast]);

  const statusLog = useMemo(() => {
    const m = order?.statusTimestamps || {};
    const entries = [];
    const obj = m instanceof Map ? Object.fromEntries(m.entries()) : m;
    for (const [st, when] of Object.entries(obj)) {
      entries.push({ status: st, at: when });
    }
    if (order?.createdAt && !entries.some((e) => e.status === "created")) {
      entries.unshift({ status: "created", at: order.createdAt });
    }
    entries.sort((a, b) => new Date(a.at) - new Date(b.at));
    return entries;
  }, [order]);

  const onCopyId = async () => {
    try {
      const text = order?.orderNumber || id;
      await navigator.clipboard.writeText(text);
      toast("Order number copied");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="orderDetails">
      <div className="orderDetails__top">
        <button type="button" className="btn--ghost" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="orderDetails__title">
          Order <span className="orderDetails__code">{order?.orderNumber || id}</span>
        </h2>
        <button type="button" className="btn--ghost btn--sm" onClick={onCopyId}>
          Copy
        </button>
      </div>

      {err && <div className="market__error">{err}</div>}
      {loading && <div className="market__loading">Loading…</div>}

      {!loading && order && (
        <>
          {/* Meta panel */}
          <section className="orderDetails__section">
            <div className="orderDetails__meta">
              <div className="metaRow">
                <div className="metaLabel">Status</div>
                <div className="metaValue">
                  <span className={`badge badge--status status--${order.status}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
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
                  {(order.products || []).map((it, idx) => {
                    const pid = String(it.product);
                    return (
                      <tr key={pid + idx}>
                        <td>{names[pid] || pid}</td>
                        <td>{Number(it.quantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Status timeline */}
          <section className="orderDetails__section">
            <h3 className="orderDetails__subtitle">Status timeline</h3>
            {statusLog.length ? (
              <ul className="orderDetails__timeline">
                {statusLog.map((e, i) => (
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
