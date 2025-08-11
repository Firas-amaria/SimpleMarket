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
 * payload: { region, items: [{ productId, quantity }] }
 */
export async function createOrder({ region, items }) {
  const { data } = await api.post(`/market/createOrder`, { region, items });
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
