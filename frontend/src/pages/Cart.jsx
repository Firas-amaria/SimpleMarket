// src/pages/Cart.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import {
  loadCart, updateItem, removeItem, clearCart, totalGrams,
} from "../utils/cart";

function readUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}
function gramsToKg(g) { return Math.round((g / 1000) * 1000) / 1000; } // show 3 decimals nicely

export default function CartPage() {
  const navigate = useNavigate();
  const user = readUser();
  const region = (localStorage.getItem("region") || "").toLowerCase();
  const [cart, setCart] = useState(loadCart());
  const [products, setProducts] = useState({}); // id -> product detail
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Load product details for items (one-by-one for simplicity)
  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = cart.items.map(i => i.productId);
      if (ids.length === 0) { setProducts({}); return; }

      try {
        setLoading(true);
        const entries = await Promise.all(ids.map(async (id) => {
          try {
            const { data } = await api.get(`/market/products/${id}`);
            return [id, data];
          } catch {
            return [id, null]; // product missing/inactive
          }
        }));
        if (!alive) return;
        const map = {};
        for (const [id, data] of entries) map[id] = data;
        setProducts(map);
        setErr("");
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message || "Failed to load cart");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cart]);

  const onChangeGrams = (productId, next) => {
    const STEP = 50, MIN = 50, MAX = 50000;
    const clamp = (g) => Math.min(MAX, Math.max(MIN, Math.round(g / STEP) * STEP));
    const updated = updateItem(productId, clamp(next));
    setCart(updated);
  };

  const onDec = (productId, current) => onChangeGrams(productId, current - 50);
  const onInc = (productId, current) => onChangeGrams(productId, current + 50);

  const onRemove = (productId) => {
    const updated = removeItem(productId);
    setCart(updated);
  };

  const onClear = () => {
    clearCart();
    setCart(loadCart());
  };

  const onCheckout = async () => {
    if (!user) return navigate("/login");
    if (!region) return navigate("/market");

    if (!cart.items.length) return;

    try {
      setLoading(true);
      setErr("");

      // Build payload with GRAMS per your requirement
      const payload = {
        region,
        items: cart.items.map(i => ({ productId: i.productId, quantity: i.grams })),
      };

      const { data } = await api.post("/market/orders", payload);
      // Success → clear cart and navigate (e.g., to profile or orders page)
      clearCart();
      setCart(loadCart());
      alert(`Order placed! #${data.orderNumber || data._id}`);
      navigate("/profile"); // or /orders if you add it later
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const totalItems = cart.items.length;
  const totalG = totalGrams();
  const totalKG = gramsToKg(totalG);

  return (
    <div className="cart">
      <div className="cart__top">
        <h2 className="cart__title">Your Cart</h2>
        {totalItems > 0 && (
          <button type="button" className="btn--ghost" onClick={onClear}>
            Clear cart
          </button>
        )}
      </div>

      {err && <div className="market__error">{err}</div>}
      {loading && <div className="market__loading">Loading…</div>}

      {!totalItems ? (
        <div className="cart__empty">
          Your cart is empty.
          <button className="btn--ghost" onClick={() => navigate("/market")}>Go to Market</button>
        </div>
      ) : (
        <>
          <ul className="cart__list">
            {cart.items.map(({ productId, grams }) => {
              const p = products[productId];
              const name = p?.name || "Unavailable product";
              const image = p?.image || null;

              return (
                <li key={productId} className="cart__item">
                  <div className={`cart__image ${image ? "" : "is-placeholder"}`} style={image ? { backgroundImage: `url(${image})` } : undefined} />
                  <div className="cart__info">
                    <div className="cart__name">{name}</div>

                    <div className="qty">
                      <button className="qty__btn" onClick={() => onDec(productId, grams)} aria-label="Decrease by 50 grams">−</button>
                      <input className="qty__input" value={grams} onChange={(e) => onChangeGrams(productId, Number(e.target.value) || grams)} />
                      <span className="qty__unit">g</span>
                      <button className="qty__btn" onClick={() => onInc(productId, grams)} aria-label="Increase by 50 grams">＋</button>
                    </div>

                    {!p && <div className="cart__warning">This product is no longer available. Please remove it.</div>}
                  </div>

                  <div className="cart__actions">
                    <button className="btn--ghost" onClick={() => onRemove(productId)}>Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="cart__summary">
            <div><strong>Items:</strong> {totalItems}</div>
            <div><strong>Total weight:</strong> {totalG} g ({totalKG} kg)</div>
            <button type="button" className="cart__checkout" onClick={onCheckout} disabled={loading}>
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
