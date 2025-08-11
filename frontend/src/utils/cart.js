// src/utils/cart.js
// Cart is per (userId, region) and expires after 7 days.
// Quantities are stored in GRAMS.

const VERSION = 1;
const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}
function getCurrentUserId() {
  return readUser()?.id || null;
}
function getCurrentRegion() {
  try {
    return (localStorage.getItem("region") || "").toLowerCase();
  } catch {
    return "";
  }
}

function keyFor(userId, region) {
  const uid = userId || "guest";
  const reg = (region || "").toLowerCase() || "unknown";
  return `cart:v${VERSION}:${uid}:${reg}`;
}

function now() {
  return Date.now();
}

export function loadCart(
  userId = getCurrentUserId(),
  region = getCurrentRegion()
) {
  const key = keyFor(userId, region);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { version: VERSION, updatedAt: 0, region, items: [] };
    const data = JSON.parse(raw);
    if (typeof data !== "object" || !Array.isArray(data.items)) {
      return { version: VERSION, updatedAt: 0, region, items: [] };
    }
    return data;
  } catch {
    return { version: VERSION, updatedAt: 0, region, items: [] };
  }
}

export function saveCart(
  cart,
  userId = getCurrentUserId(),
  region = getCurrentRegion()
) {
  const key = keyFor(userId, region);
  const toSave = {
    version: VERSION,
    updatedAt: now(),
    region,
    items: Array.isArray(cart.items) ? cart.items : [],
  };
  localStorage.setItem(key, JSON.stringify(toSave));
  window.dispatchEvent(new Event("cartChanged"));
  return toSave;
}

export function clearCart(
  userId = getCurrentUserId(),
  region = getCurrentRegion()
) {
  const key = keyFor(userId, region);
  localStorage.removeItem(key);
  window.dispatchEvent(new Event("cartChanged"));
}

export function addItem(
  productId,
  grams,
  userId = getCurrentUserId(),
  region = getCurrentRegion()
) {
  const STEP = 50;
  const MIN = 50;
  const MAX = 5000;
  const clamp = (g) =>
    Math.min(MAX, Math.max(MIN, Math.round(g / STEP) * STEP));

  const cart = loadCart(userId, region);
  const idx = cart.items.findIndex((i) => i.productId === productId);
  if (idx === -1) {
    cart.items.push({ productId, grams: clamp(grams) });
  } else {
    cart.items[idx].grams = clamp(cart.items[idx].grams + grams);
  }
  return saveCart(cart, userId, region);
}

export function updateItem(
  productId,
  grams,
  userId = getCurrentUserId(),
  region = getCurrentRegion()
) {
  const STEP = 50;
  const MIN = 50;
  const MAX = 50000; // allow higher cap on direct input if needed
  const clamp = (g) =>
    Math.min(MAX, Math.max(MIN, Math.round(g / STEP) * STEP));

  const cart = loadCart(userId, region);
  const idx = cart.items.findIndex((i) => i.productId === productId);
  if (idx !== -1) {
    cart.items[idx].grams = clamp(grams);
    return saveCart(cart, userId, region);
  }
  return cart;
}

export function removeItem(
  productId,
  userId = getCurrentUserId(),
  region = getCurrentRegion()
) {
  const cart = loadCart(userId, region);
  cart.items = cart.items.filter((i) => i.productId !== productId);
  return saveCart(cart, userId, region);
}

export function itemCount(
  userId = getCurrentUserId(),
  region = getCurrentRegion()
) {
  const cart = loadCart(userId, region);
  return cart.items.length;
}

export function totalGrams(
  userId = getCurrentUserId(),
  region = getCurrentRegion()
) {
  const cart = loadCart(userId, region);
  return cart.items.reduce((sum, i) => sum + (i.grams || 0), 0);
}

// Expiry: clear if older than 7 days
export function clearIfStale(
  userId = getCurrentUserId(),
  region = getCurrentRegion()
) {
  const cart = loadCart(userId, region);
  if (!cart.updatedAt) return;
  if (now() - cart.updatedAt > MS_7_DAYS) {
    clearCart(userId, region);
  }
}

// Utility to clear all carts for a specific user (use on logout)
export function clearAllUserCarts(userId) {
  if (!userId) return;
  const prefix = `cart:v${VERSION}:${userId}:`;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new Event("cartChanged"));
}
