// src/utils/marketApi.js
import api from "./api";

/** Internal helper to build URL query strings safely */
function toQuery(params = {}) {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qp.set(k, String(v));
  });
  const s = qp.toString();
  return s ? `?${s}` : "";
}

/**
 * Products list
 * GET /market/listProducts
 * @returns {Promise<{items: any[], total: number, page: number, pages: number}>}
 */
export async function fetchProducts({
  region,
  page = 1,
  limit = 12,
  q = "",
  inStock = true,
  category,
  minPrice,
  maxPrice,
  sort, // "price-asc" | "price-desc" | "newest" (optional)
} = {}) {
  const query = toQuery({
    region,
    page,
    limit,
    q,
    inStock: inStock ? "true" : undefined,
    category,
    minPrice,
    maxPrice,
    sort,
  });
  const { data } = await api.get(`/market/listProducts${query}`);
  return data;
}

/**
 * Single product (with stockByRegion array)
 * GET /market/getProductById/:id
 */
export async function getProductById(id) {
  const { data } = await api.get(`/market/getProductById/${id}`);
  return data; // { ...product, stockByRegion }
}

/**
 * Regions list
 * GET /market/listRegions
 */
export async function listRegions() {
  const { data } = await api.get(`/market/listRegions`);
  return data; // { items: string[] }
}

/**
 * Availability for a product in a region
 * GET /market/getAvailability?productId=&region=
 */
export async function checkAvailability(productId, region) {
  const { data } = await api.get(`/market/getAvailability`, {
    params: { productId, region },
  });
  return data; // { productId, region, availableQty }
}

/**
 * Create order (customer)
 * POST /market/createOrder
 * payload: { items: [{ productId, quantity }], shippingAddress?, payment? }
 *
 * NOTE:
 * - Region is derived server-side from the authenticated user; DO NOT send it.
 * - We strip any PAN/CVC here and only forward non-sensitive payment hints.
 * - This remains backward-compatible with older callers that pass {region}:
 *   the parameter is simply ignored when building the request body.
 */
export async function createOrder({
  items,
  shippingAddress,
  payment /*, region (ignored) */,
}) {
  const payload = {
    items,
    ...(shippingAddress
      ? { shippingAddress: sanitizeAddress(shippingAddress) }
      : {}),
    ...(payment ? { payment: sanitizePayment(payment) } : {}),
  };
  const { data } = await api.post(`/market/createOrder`, payload);
  return data; // created order doc
}

/**
 * List my orders (customer)
 * GET /market/listMyOrders
 */
export async function listMyOrders({ status, page = 1, limit = 10 } = {}) {
  const query = toQuery({ status, page, limit });
  const { data } = await api.get(`/market/listMyOrders${query}`);
  return data; // { items, total, page, pages }
}

/**
 * Get my order by id (customer)
 * GET /market/getMyOrderById/:id
 */
export async function getMyOrderById(id) {
  const { data } = await api.get(`/market/getMyOrderById/${id}`);
  return data; // order document
}

/** Normalize address to only the allowed snapshot fields */
function sanitizeAddress(addr) {
  if (!addr || typeof addr !== "object") return undefined;
  return {
    line1: addr.line1 ?? "",
    line2: addr.line2 ?? "",
    city: addr.city ?? "",
    postalCode: addr.postalCode ?? "",
    notes: addr.notes ?? "",
  };
}

/** Keep only non-sensitive payment hints (backend rejects PAN/CVC anyway) */
function sanitizePayment(pmt) {
  if (!pmt || typeof pmt !== "object") return undefined;
  return {
    brand: pmt.brand ?? "",
    last4: pmt.last4 ? String(pmt.last4).slice(-4) : "",
    expMonth: pmt.expMonth !== undefined ? Number(pmt.expMonth) : undefined,
    expYear: pmt.expYear !== undefined ? Number(pmt.expYear) : undefined,
    nameOnCard: pmt.nameOnCard ?? "",
  };
}

/**
 * Get / update saved address (no payment stored)
 * GET  /user/getMyDetails
 * PUT  /user/updateMyDetails  body: { address: { line1, line2, city, postalCode, notes } }
 */
export async function getMyDetails() {
  const { data } = await api.get(`/user/getMyDetails`);
  return data; // { user, address } or null
}

export async function updateMyDetails({ address }) {
  const { data } = await api.put(`/user/updateMyDetails`, {
    address: sanitizeAddress(address),
  });
  return data; // updated doc { user, address, ...timestamps }
}
