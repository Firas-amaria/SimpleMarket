// src/pages/Cart.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadCart, updateItem, removeItem, clearCart, totalGrams,
} from "../utils/cart";
import { useToast } from "../components/ToastProvider";
import { getProductById } from "../utils/marketApi";

function gramsToKg(g) { return Math.round((g / 1000) * 1000) / 1000; } // 3 decimals
function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `$${v.toFixed(2)}`;
}

export default function CartPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [cart, setCart] = useState(loadCart());
  const [products, setProducts] = useState({}); // id -> product detail
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
            return [id, null];
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

  const totalItems = cart.items.length;
  const totalG = totalGrams();
  const totalKG = gramsToKg(totalG);

  // price is per 100g now
  const lineItems = useMemo(() => {
    return cart.items.map(({ productId, grams }) => {
      const p = products[productId] || null;
      const pricePer100g = Number(p?.price);
      const hasPrice = Number.isFinite(pricePer100g) && pricePer100g >= 0;
      const cost = hasPrice ? (grams / 100) * pricePer100g : null;
      return {
        productId,
        grams,
        product: p,
        name: p?.name || "Unavailable product",
        image: p?.image || null,
        pricePer100g: hasPrice ? pricePer100g : null,
        cost,
      };
    });
  }, [cart.items, products]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let unpricedCount = 0;
    for (const li of lineItems) {
      if (li.cost === null) {
        unpricedCount += 1;
      } else {
        subtotal += li.cost;
      }
    }
    return { subtotal, unpricedCount };
  }, [lineItems]);

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
          <button className="btn--ghost" onClick={() => navigate("/market")}>
            Go to Market
          </button>
        </div>
      ) : (
        <>
          <ul className="cart__list">
            {lineItems.map(({ productId, grams, name, image, pricePer100g, cost, product }) => (
              <li key={productId} className="cart__item">
                <div
                  className={`cart__image ${image ? "" : "is-placeholder"}`}
                  style={image ? { backgroundImage: `url(${image})` } : undefined}
                />
                <div className="cart__info">
                  <div className="cart__name">{name}</div>

                  <div className="qty">
                    <button className="qty__btn" onClick={() => onDec(productId, grams)}>−</button>
                    <input
                      className="qty__input"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={grams}
                      onChange={(e) => onChangeGrams(productId, Number(e.target.value) || grams)}
                    />
                    <span className="qty__unit">g</span>
                    <button className="qty__btn" onClick={() => onInc(productId, grams)}>＋</button>
                  </div>

                  {pricePer100g !== null ? (
                    <div className="muted">
                      {formatMoney(pricePer100g)} / 100 g • Item cost: <strong>{formatMoney(cost)}</strong>
                    </div>
                  ) : (
                    <div className="cart__warning">
                      {product ? "Price unavailable for this product." : "This product is no longer available. Please remove it."}
                    </div>
                  )}
                </div>

                <div className="cart__actions">
                  <button className="btn--ghost" onClick={() => onRemove(productId)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>

          {err && <div className="market__error">{err}</div>}

          <div className="cart__summary">
            <div><strong>Items:</strong> {totalItems}</div>
            <div><strong>Total weight:</strong> {totalG} g ({totalKG} kg)</div>
            <div><strong>Total cost:</strong> {formatMoney(totals.subtotal)}</div>
            <button
              type="button"
              className="cart__checkout"
              onClick={() => navigate("/checkout")}
              disabled={loading}
            >
              Proceed to Checkout
            </button>
          </div>

          {totals.unpricedCount > 0 && (
            <p className="muted" style={{ marginTop: 8 }}>
              Note: {totals.unpricedCount} item{totals.unpricedCount > 1 ? "s" : ""} has no price and wasn’t included in the total.
            </p>
          )}
        </>
      )}
    </div>
  );
}
