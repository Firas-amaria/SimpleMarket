// backend/jobs/orderProgressor.js
import "dotenv/config";
import connectDB from "../utils/db.js";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import {
  ORDER_STATUS_FLOW,
  IS_AUTOPROGRESS_ENABLED,
  nextStatus,
  cutoffFor,
} from "../config/orderProgressor.js";

/**
 * Advance exactly one order currently in `status` if it's due, atomically.
 * Uses `statusTimestamps.<status>` as the anchor (already present in your schema).
 */
async function advanceOneByStatus(status) {
  const next = nextStatus(status);
  if (!next) return null; // no next step (terminal)

  const now = new Date();
  const tsField = `statusTimestamps.${status}`;
  const cutoff = cutoffFor(status, now);
  if (!cutoff) return null;

  // Build the $set update (advance to next + stamp new timestamp)
  const set = {
    status: next,
    updatedAt: now,
  };
  set[`statusTimestamps.${next}`] = now;

  // Atomically claim one due order in this status.
  // We exclude terminals implicitly by filtering `status` to the current step.
  const updated = await Order.findOneAndUpdate(
    {
      status, // e.g., "pending"
      [tsField]: { $lte: cutoff }, // statusTimestamps.pending <= cutoff
    },
    { $set: set },
    {
      sort: { [tsField]: 1, createdAt: 1 },
      new: true,
      lean: true,
    }
  );

  return updated; // null if none due
}

/**
 * Progress up to `maxPerRun` orders across all steps, one at a time.
 * This is concurrency-safe even with multiple workers (atomic claim).
 */
export async function progressDueOrders({ maxPerRun = 200 } = {}) {
  let progressed = 0;

  // cycle until we either hit the cap or no due orders remain
  while (progressed < maxPerRun) {
    let advancedInThisCycle = false;

    // try each non-terminal step in order
    for (const st of ORDER_STATUS_FLOW.slice(0, -1)) {
      const upd = await advanceOneByStatus(st);
      if (upd) {
        progressed += 1;
        advancedInThisCycle = true;
        break; // go check from the first status again
      }
    }

    if (!advancedInThisCycle) break;
  }

  return progressed;
}

async function main() {
  if (!IS_AUTOPROGRESS_ENABLED) {
    console.log(
      "[orderProgressor] Auto-progress is disabled (set NODE_ENV=development or ORDER_AUTOPROGRESS_ENABLED=1 to enable)."
    );
    process.exit(0);
  }

  await connectDB();

  const args = new Set(process.argv.slice(2));
  const loop = args.has("--loop");
  const once = args.has("--once") || !loop;

  if (once) {
    const n = await progressDueOrders({ maxPerRun: 500 });
    console.log(`[orderProgressor] progressed ${n} orders (once)`);
    await mongoose.connection.close();
    process.exit(0);
  }

  console.log("[orderProgressor] loop mode started (every 30s)");
  const INTERVAL_MS = 30_000;

  const tick = async () => {
    try {
      const n = await progressDueOrders({ maxPerRun: 500 });
      if (n) console.log(`[orderProgressor] progressed ${n} orders`);
    } catch (e) {
      console.error("[orderProgressor] error:", e?.message || e);
    }
  };

  // Kick once immediately, then interval
  tick();
  setInterval(tick, INTERVAL_MS);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
