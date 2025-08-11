// src/utils/marketApi.js
import api from "./api";

export async function fetchProducts({
  region,
  page = 1,
  limit = 12,
  q = "",
  inStock = true,
  category, // NEW
} = {}) {
  const params = new URLSearchParams();
  if (region) params.set("region", region);
  if (q) params.set("q", q);
  if (inStock) params.set("inStock", "true");
  if (category) params.set("category", category); // NEW
  params.set("page", String(page));
  params.set("limit", String(limit));

  const { data } = await api.get(`/market/products?${params.toString()}`);
  return data; // { items, total, page, pages }
}

export async function checkAvailability(productId, region) {
  const { data } = await api.get(`/market/availability`, {
    params: { productId, region },
  });
  return data; // { productId, region, availableQty }
}
