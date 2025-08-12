// backend/controllers/user.controller.js
import CustomerDetails from "../models/CustomerDetails.js";
import User from "../models/User.js"; // ← add this

// Canonical regions (server-side guard)
const CANON_REGIONS = ["east", "west"];
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

/** Utility: remove sensitive fields before sending to client */
function sanitizeUser(u) {
  if (!u) return null;
  const obj = typeof u.toObject === "function" ? u.toObject() : u;
  const {
    password,
    __v, // sensitive/internal
    // keep everything else
    ...safe
  } = obj;
  return safe;
}

/**
 * GET /api/user/getMyProfile
 * Returns the logged-in user's profile (sans password).
 */
export async function getMyProfile(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const user = await User.findById(userId).select("-password -__v").lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
}

/**
 * PUT /api/user/updateMyProfile
 * User can update only: name, profileImage.
 * Region is NOT editable here (admin can handle via admin endpoints if needed).
 */
export async function updateMyProfile(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const { name, profileImage } = req.body || {};
    // If client tries to pass region, reject explicitly
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "region")) {
      return res
        .status(403)
        .json({ message: "Region cannot be changed by the user" });
    }

    const updates = {};

    if (typeof name === "string") {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        return res.status(400).json({ message: "name cannot be empty" });
      }
      updates.name = trimmed;
    }

    if (typeof profileImage === "string") {
      // allow empty string to clear avatar
      updates.profileImage = profileImage.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("-password -__v")
      .lean();

    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({ user: updated });
  } catch (err) {
    console.error("updateMyProfile error:", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
}
