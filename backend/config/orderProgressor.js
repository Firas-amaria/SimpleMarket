// backend/config/orderProgressor.js

// Ordered flow we auto-advance through.
// Terminals: delivered (and cancelled is handled implicitly by not matching queries).
export const ORDER_STATUS_FLOW = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

// How long to wait in each status before advancing to the next (in ms).
// Tune freely — these are just demo defaults.
export const ORDER_AUTO_DELAYS_MS = {
  pending: 60_000, // 1 min
  confirmed: 120_000, // 2 min
  preparing: 180_000, // 3 min
  out_for_delivery: 180_000, // 3 min
  // delivered: terminal
};

// Global on/off switch.
// Enabled if you set ORDER_AUTOPROGRESS_ENABLED=1
export const IS_AUTOPROGRESS_ENABLED =
  String(process.env.ORDER_AUTOPROGRESS_ENABLED) === "1";

// Helper: get next status in the flow; returns null if none.
export function nextStatus(current) {
  const i = ORDER_STATUS_FLOW.indexOf(current);
  if (i < 0 || i >= ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[i + 1];
}

// Helper: how long to wait for a given status.
export function delayFor(status) {
  return ORDER_AUTO_DELAYS_MS[status] ?? null;
}

// Helper: compute the cutoff timestamp (documents older than this are due).
export function cutoffFor(status, now = new Date()) {
  const delay = delayFor(status);
  if (!delay) return null;
  return new Date(now.getTime() - delay);
}
