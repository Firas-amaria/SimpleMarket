// src/pages/Checkout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import {
  getMyDetails,
  updateMyDetails,
  createOrder,
  getProductById,
} from "../utils/marketApi";
import {
  loadCart,
  totalGrams,
  clearCart,
  removeItem as removeFromCart,
} from "../utils/cart";

/* Helpers */
function readUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}
function gramsToKg(g) { return Math.round((g / 1000) * 1000) / 1000; } // 3 decimals
function formatCardNumberDisplay(digitsOnly) {
  return String(digitsOnly).replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
}
function clampInt(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, Math.trunc(v)));
}
function nowYear() { return new Date().getFullYear(); }
function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `$${v.toFixed(2)}`; // change symbol if you prefer ILS
}

/* Random demo-payment generator */
function randomPayment() {
  // Simple plausible demo values; no real PANs.
  const brands = ["visa", "mastercard"];
  const brand = brands[Math.floor(Math.random() * brands.length)];
  const nameOnCard = "Test User";
  // Generate 16 digits, prefix 4 for visa; 51 for mastercard
  const prefix = brand === "visa" ? "4" : "51";
  const restLen = 16 - prefix.length;
  let digits = prefix;
  for (let i = 0; i < restLen; i++) digits += Math.floor(Math.random() * 10);
  const expMonth = clampInt(Math.ceil(Math.random() * 12), 1, 12);
  const expYear = nowYear() + clampInt(Math.ceil(Math.random() * 4) + 1, 1, 5);
  const cvc = String(100 + Math.floor(Math.random() * 900));
  return { brand, nameOnCard, cardNumber: digits, expMonth, expYear, cvc };
}

export default function Checkout() {
  const navigate = useNavigate();
  const toast = useToast();

  const user = readUser();

  // Cart state
  const [cart, setCart] = useState(() => loadCart());
  const [products, setProducts] = useState({}); // id -> full product doc (needs price)
  const totalG = useMemo(() => totalGrams(), [cart]);
  const totalKG = gramsToKg(totalG);

  // Address form (frontend requires: line1, city, postalCode)
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    notes: "",
  });
  const [rememberAddress, setRememberAddress] = useState(true); // default: checked

  // Payment (demo; NOT stored in CustomerDetails)
  const [payment, setPayment] = useState({
    nameOnCard: "",
    brand: "",
    cardNumber: "", // digits only in state
    expMonth: "",
    expYear: "",
    cvc: "",
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState("");

  // Guards
  useEffect(() => {
    if (!user) {
      toast("Please log in first");
      navigate("/login", { replace: true });
      return;
    }
    const hasItems = (cart.items || []).length > 0;
    if (!hasItems) {
      toast("Your cart is empty");
      navigate("/cart", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill address + load product details for review (need price per 100g)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // Prefill address
        try {
          const saved = await getMyDetails();
          if (saved?.address) {
            setAddress((a) => ({ ...a, ...saved.address }));
          }
        } catch {/* ignore prefill errors */}

        // Product details
        const ids = Array.from(new Set((cart.items || []).map(i => i.productId)));
        const pairs = await Promise.all(ids.map(async (id) => {
          try {
            const data = await getProductById(id); // { name, price, image, ... }
            return [id, data];
          } catch { return [id, null]; }
        }));
        if (!alive) return;
        const map = {};
        for (const [k, v] of pairs) map[k] = v;
        setProducts(map);
      } catch (e) {
        if (!alive) return;
        const message = e?.response?.data?.message || e.message || "Failed to initialize checkout";
        setErr(message);
        toast(message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cart, toast]);

  // Pricing (price is per 100g)
  const lineItems = useMemo(() => {
    return (cart.items || []).map(({ productId, grams }) => {
      const p = products[productId] || null;
      const pricePer100g = Number(p?.price);
      const hasPrice = Number.isFinite(pricePer100g) && pricePer100g >= 0;
      const cost = hasPrice ? (grams / 100) * pricePer100g : null;
      return {
        productId,
        name: p?.name || productId,
        grams,
        pricePer100g: hasPrice ? pricePer100g : null,
        cost, // may be null
      };
    });
  }, [cart.items, products]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let unpriced = 0;
    for (const li of lineItems) {
      if (li.cost == null) unpriced += 1;
      else subtotal += li.cost;
    }
    return { subtotal, unpriced };
  }, [lineItems]);

  // Validation
  const isAddressValid = useMemo(() => {
    return Boolean(address.line1 && address.city && address.postalCode);
  }, [address]);

  const isPaymentValid = useMemo(() => {
    const digits = String(payment.cardNumber).replace(/\D/g, "");
    const lenOk = digits.length >= 12 && digits.length <= 19;
    const monthOk = Number(payment.expMonth) >= 1 && Number(payment.expMonth) <= 12;
    const yearOk = Number(payment.expYear) >= nowYear();
    const cvcOk = /^\d{3,4}$/.test(String(payment.cvc));
    return Boolean(payment.nameOnCard && payment.brand && lenOk && monthOk && yearOk && cvcOk);
  }, [payment]);

  const canSubmit = isAddressValid && isPaymentValid && (cart.items || []).length > 0;

  // Handlers
  const handleRandomize = () => {
    const demo = randomPayment();
    setPayment({
      nameOnCard: demo.nameOnCard,
      brand: demo.brand,
      cardNumber: demo.cardNumber,
      expMonth: String(demo.expMonth),
      expYear: String(demo.expYear),
      cvc: demo.cvc,
    });
  };

  const handlePlaceOrder = async () => {
    if (!canSubmit) {
      toast("Please complete address and payment details");
      return;
    }

    try {
      setPlacing(true);
      setErr("");

      // Optionally remember address
      if (rememberAddress) {
        try {
          await updateMyDetails({ address });
        } catch (e) {
          // Non-fatal: continue with order
          console.warn("updateMyDetails failed:", e?.response?.data || e.message);
        }
      }

      // Build payload
      const items = (cart.items || []).map(i => ({
        productId: i.productId,
        quantity: i.grams, // grams
      }));

      const created = await createOrder({
        items,
        shippingAddress: address,
        payment: {
          brand: payment.brand,
          last4: String(payment.cardNumber).replace(/\D/g, "").slice(-4),
          expMonth: Number(payment.expMonth),
          expYear: Number(payment.expYear),
          nameOnCard: payment.nameOnCard,
        },
      });

      // Success
      clearCart();
      toast(`Order placed! #${created.orderNumber || created._id}`);
      navigate(`/orders/${created._id}`);
    } catch (e) {
      const status = e?.response?.status;
      const message =
        e?.response?.data?.message ||
        (status === 409 ? "Insufficient stock for one or more items" : e.message) ||
        "Checkout failed";

      // Auto-remove offending item if server message includes a product id
      if (status === 409 && typeof message === "string") {
        const m = message.match(/product\s+([a-f\d]{24})/i);
        if (m && m[1]) {
          const badId = m[1];
          removeFromCart(badId);
          setCart(loadCart()); // refresh local state
          toast("One item was out of stock and has been removed from your cart.");
        }
      }

      setErr(message);
      toast(message);
    } finally {
      setPlacing(false);
    }
  };

  const displayCardNumber = formatCardNumberDisplay(payment.cardNumber);

  return (
    <div className="checkout page">
      <div className="checkout__top">
        <button type="button" className="btn--ghost" onClick={() => navigate("/cart")}>
          ← Back to Cart
        </button>
        <h2 className="checkout__title">Checkout</h2>
      </div>

      {err && <div className="market__error">{err}</div>}
      {loading && <div className="market__loading">Loading…</div>}

      {!loading && (
        <>
          {/* 1) Items & totals (moved to top) */}
          <section className="card">
            <h3>Items & totals</h3>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="ta-right">Qty (g)</th>
                    <th className="ta-right">Price / 100 g</th>
                    <th className="ta-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.productId}>
                      <td>{li.name}</td>
                      <td className="ta-right">{li.grams}</td>
                      <td className="ta-right">
                        {li.pricePer100g != null ? formatMoney(li.pricePer100g) : "—"}
                      </td>
                      <td className="ta-right">
                        {li.cost != null ? <strong>{formatMoney(li.cost)}</strong> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={2} className="ta-right">Total weight:</th>
                    <th colSpan={2} className="ta-right">
                      {totalG} g ({totalKG} kg)
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={2} className="ta-right">Total cost:</th>
                    <th colSpan={2} className="ta-right">
                      <strong>{formatMoney(totals.subtotal)}</strong>
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
            {totals.unpriced > 0 && (
              <p className="muted" style={{ marginTop: 8 }}>
                Note: {totals.unpriced} item{totals.unpriced > 1 ? "s" : ""} has no price and wasn’t included in the total.
              </p>
            )}
          </section>

          {/* 2) Payment (demo) */}
          <section className="card">
            <h3>Payment (demo)</h3>
            <div className="grid">
              <label>Name on card
                <input
                  autoComplete="cc-name"
                  value={payment.nameOnCard}
                  onChange={(e) => setPayment({ ...payment, nameOnCard: e.target.value })}
                />
              </label>
              <label>Brand (e.g., visa)
                <input
                  autoComplete="cc-type"
                  value={payment.brand}
                  onChange={(e) => setPayment({ ...payment, brand: e.target.value.toLowerCase() })}
                />
              </label>
              <label>Card number (fake)
                <input
                  autoComplete="cc-number"
                  inputMode="numeric"
                  pattern="\d*"
                  value={displayCardNumber}
                  onChange={(e) =>
                    setPayment({
                      ...payment,
                      cardNumber: e.target.value.replace(/\D/g, "").slice(0, 19),
                    })
                  }
                  placeholder="4242 4242 4242 4242"
                />
              </label>
              <label>Exp. month
                <input
                  autoComplete="cc-exp-month"
                  inputMode="numeric"
                  pattern="\d*"
                  value={payment.expMonth}
                  onChange={(e) =>
                    setPayment({ ...payment, expMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })
                  }
                  placeholder="MM"
                />
              </label>
              <label>Exp. year
                <input
                  autoComplete="cc-exp-year"
                  inputMode="numeric"
                  pattern="\d*"
                  value={payment.expYear}
                  onChange={(e) =>
                    setPayment({ ...payment, expYear: e.target.value.replace(/\D/g, "").slice(0, 4) })
                  }
                  placeholder={String(nowYear())}
                />
              </label>
              <label>CVC
                <input
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  pattern="\d*"
                  value={payment.cvc}
                  onChange={(e) =>
                    setPayment({ ...payment, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })
                  }
                  placeholder="3–4 digits"
                />
              </label>
            </div>
            <div className="row">
              <button type="button" className="btn--ghost" onClick={handleRandomize}>
                Fill with random demo data
              </button>
            </div>
            <p className="muted">
              This is a demo checkout. Payment data is not processed and only non-sensitive
              info (brand/last4/expiry/name) is stored on the order for receipts.
            </p>
          </section>

          {/* 3) Delivery address */}
          <section className="card">
            <h3>Delivery address</h3>
            <div className="grid">
              <label>Address line 1*
                <input
                  autoComplete="address-line1"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  placeholder="Street, number"
                />
              </label>
              <label>Address line 2
                <input
                  autoComplete="address-line2"
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  placeholder="Apartment, floor, etc."
                />
              </label>
              <label>City*
                <input
                  autoComplete="address-level2"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </label>
              <label>Postal code* 
                <input
                  autoComplete="postal-code"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                />
              </label>
              <label>Notes for delivery
                <textarea
                  value={address.notes}
                  onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                  placeholder="Gate code, drop-off instructions…"
                />
              </label>
            </div>
            <label className="row">
              <input
                type="checkbox"
                checked={rememberAddress}
                onChange={(e) => setRememberAddress(e.target.checked)}
              />
              <span>Remember this address for next time</span>
            </label>
          </section>

          {/* Final actions */}
          <section className="card">
            <div className="actions">
              <button type="button" className="btn--ghost" onClick={() => navigate("/cart")}>
                Back to Cart
              </button>
              <button type="button" className="btn" disabled={!canSubmit || placing} onClick={handlePlaceOrder}>
                {placing ? "Placing…" : "Place Order"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
