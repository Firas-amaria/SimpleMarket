// src/utils/region.js
const CANON_REGIONS = ["east", "west"]; // align with your backend/Stock docs

export function getRegion() {
  try {
    const r = (localStorage.getItem("region") || "").toLowerCase().trim();
    if (CANON_REGIONS.includes(r)) return r;
  } catch {}
  // invalid -> remove it
  localStorage.removeItem("region");
  return null;
}

export function setRegion(r) {
  const v = (r || "").toLowerCase().trim();
  if (!CANON_REGIONS.includes(v)) throw new Error("Invalid region");
  localStorage.setItem("region", v);
  window.dispatchEvent(new Event("regionChanged"));
}

export function listRegionsCached() {
  // For now return canon list; we can fetch /api/market/regions later if you want dynamic
  return CANON_REGIONS.slice();
}
