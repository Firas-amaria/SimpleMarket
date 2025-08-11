// src/pages/Cart.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadCart, updateItem, removeItem, clearCart, totalGrams,
} from "../utils/cart";
import { useToast } from "../components/ToastProvider";
import { getProductById, createOrder } from "../utils/marketApi"; // ← use the utils

function readUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}
function gramsToKg(g) { return Math.round((g / 1000) * 1000) / 1000; } // 3 decimals

export default function CartPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const user = readUser();
  const region = (localStorage.getItem("region") || "").toLowerCase();

  const [cart, setCart] = useState(loadCart());
  const [products, setProducts] = useState({}); // id -> product detail
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Load product details for items
  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = cart.items.map(i => i.productId);
      if (ids.length === 0) { setProducts({}); return; }

      try {
        setLoading(true);
        setErr("");
        toast("Refreshing your cart items…");

        const entries = await Promise.all(ids.map(async (id) => {
          try {
            const data = await getProductById(id);
            return [id, data];
          } catch {
            return [id, null]; // product missing/inactive
          }
        }));

        if (!alive) return;
        const map = {};
        for (const [id, data] of entries) map[id] = data;
        setProducts(map);
      } catch (e) {
        if (!alive) return;
        const message = e?.response?.data?.message || e.message || "Failed to load cart";
        setErr(message);
        toast(message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cart, toast]);

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
    toast("Removed item from cart");
  };

  const onClear = () => {
    clearCart();
    setCart(loadCart());
    toast("Cart cleared");
  };

  const onCheckout = async () => {
    if (!user) {
      toast("Please log in to checkout");
      return navigate("/login");
    }
    if (!region) {
      toast("Please choose a region first");
      return navigate("/market");
    }
    if (!cart.items.length) return;

    try {
      setLoading(true);
      setErr("");

      const payload = {
        region,
        items: cart.items.map(i => ({ productId: i.productId, quantity: i.grams })), // grams
      };

      toast("Placing your order…");
      const created = await createOrder(payload);

      clearCart();
      setCart(loadCart());
      toast(`Order placed! #${created.orderNumber || created._id}`);
      navigate("/profile"); // or /orders when ready
    } catch (e) {
      const status = e?.response?.status;
      const message =
        e?.response?.data?.message ||
        (status === 409 ? "Insufficient stock for one or more items" : e.message) ||
        "Checkout failed";
      setErr(message);
      toast(message);
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
                  <div
                    className={`cart__image ${image ? "" : "is-placeholder"}`}
                    style={image ? { backgroundImage: `url(${image})` } : undefined}
                  />
                  <div className="cart__info">
                    <div className="cart__name">{name}</div>

                    <div className="qty">
                      <button className="qty__btn" onClick={() => onDec(productId, grams)} aria-label="Decrease by 50 grams">−</button>
                      <input
                        className="qty__input"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={grams}
                        onChange={(e) => onChangeGrams(productId, Number(e.target.value) || grams)}
                        aria-label="Amount in grams"
                      />
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

          {err && <div className="market__error">{err}</div>}
          {/* Using toast for transient loading; keep error banner for visibility */}

          <div className="cart__summary">
            <div><strong>Items:</strong> {totalItems}</div>
            <div><strong>Total weight:</strong> {totalG} g ({totalKG} kg)</div>
            <button type="button" className="cart__checkout" onClick={onCheckout} disabled={loading}>
              {loading ? "Processing…" : "Proceed to Checkout"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
