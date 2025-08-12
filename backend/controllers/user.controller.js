// backend/controllers/user.controller.js
import CustomerDetails from "../models/CustomerDetails.js";

/**
 * GET /api/user/me/details
 * Returns saved delivery address for the logged-in user (or null if none).
 */
export async function getMyDetails(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const doc = await CustomerDetails.findOne({ user: userId })
      .select({ user: 1, address: 1, createdAt: 1, updatedAt: 1, _id: 0 })
      .lean();

    return res.json(doc || null);
  } catch (err) {
    console.error("getMyDetails error:", err);
    return res.status(500).json({ message: "Failed to load user details" });
  }
}

/**
 * PUT /api/user/me/details
 * Upserts ONLY the user's delivery address.
 * Body: { address: { line1, line2, city, postalCode, notes } }
 * Any attempt to pass payment fields is rejected.
 */
export async function updateMyDetails(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const { address, payment, cardNumber, cvc } = req.body || {};

    // Explicitly reject any payment-like fields
    if (payment || cardNumber || cvc) {
      return res
        .status(400)
        .json({ message: "Payment details are not stored" });
    }

    if (!address || typeof address !== "object") {
      return res
        .status(400)
        .json({ message: "address is required and must be an object" });
    }

    const normalized = {
      line1: address.line1 ?? "",
      line2: address.line2 ?? "",
      city: address.city ?? "",
      postalCode: address.postalCode ?? "",
      notes: address.notes ?? "",
    };

    const doc = await CustomerDetails.findOneAndUpdate(
      { user: userId },
      { $set: { user: userId, address: normalized } },
      { upsert: true, new: true }
    )
      .select({ user: 1, address: 1, createdAt: 1, updatedAt: 1, _id: 0 })
      .lean();

    return res.json(doc);
  } catch (err) {
    console.error("updateMyDetails error:", err);
    return res.status(500).json({ message: "Failed to update user details" });
  }
}
