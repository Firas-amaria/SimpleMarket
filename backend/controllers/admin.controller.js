// ESM file
import mongoose from "mongoose";

import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Stock from "../models/Stock.js";

const STATUS_CHAIN = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];
function nextStatusOf(s) {
  const i = STATUS_CHAIN.indexOf(s);
  return i >= 0 && i < STATUS_CHAIN.length - 1 ? STATUS_CHAIN[i + 1] : null;
}

/** Utility: safe field picker */
const pick = (obj, keys) =>
  keys.reduce(
    (acc, k) => (obj[k] !== undefined ? ((acc[k] = obj[k]), acc) : acc),
    {}
  );

/** ---------------- Dashboard ---------------- */
export async function getDashboardStats(_req, res) {
  try {
    const [products, orders, users, pending, delivered] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "delivered" }),
    ]);

    res.json({
      cards: [
        { key: "products", value: products },
        { key: "orders", value: orders },
        { key: "users", value: users },
        { key: "pendingOrders", value: pending },
        { key: "deliveredOrders", value: delivered },
      ],
    });
  } catch (e) {
    res
      .status(500)
      .json({ message: "Failed to load dashboard stats", error: e.message });
  }
}

/** ---------------- Products ---------------- */
// GET /api/admin/listProducts
export async function listProducts(req, res) {
  try {
    const { q, active, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (q) {
      filter.name = { $regex: String(q), $options: "i" };
    }
    if (active !== undefined && active !== "") {
      filter.isActive = active === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (e) {
    res
      .status(500)
      .json({ message: "Failed to list products", error: e.message });
  }
}

// GET /api/admin/getProduct/:id
export async function getProduct(req, res) {
  try {
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Product not found" });
    res.json(item);
  } catch (e) {
    res
      .status(500)
      .json({ message: "Failed to get product", error: e.message });
  }
}

// POST /api/admin/createProduct
// expects { name, price, image?, category?, description?, isActive? }
export async function createProduct(req, res) {
  try {
    const body = req.body || {};
    const data = pick(body, [
      "name",
      "price",
      "image",
      "category",
      "description",
      "isActive",
    ]);

    // Required fields
    if (!data.name || data.price == null) {
      return res.status(400).json({ message: "name and price are required" });
    }

    // Coerce & validate price
    const priceNum = Number(data.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res
        .status(400)
        .json({ message: "price must be a non-negative number" });
    }

    // Normalize optional fields
    const doc = {
      name: String(data.name).trim(),
      price: priceNum,
    };
    if (data.category != null) doc.category = String(data.category).trim();
    if (data.description != null) doc.description = String(data.description);
    if (data.image != null) doc.image = String(data.image).trim();
    if (data.isActive != null) doc.isActive = Boolean(data.isActive);

    const product = await Product.create(doc);
    return res.status(201).json(product);
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to create product", error: e.message });
  }
}

// PUT /api/admin/updateProduct/:id
// accepts any subset of: { name, price, image, category, description, isActive }
export async function updateProduct(req, res) {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const incoming = pick(body, [
      "name",
      "price",
      "image",
      "category",
      "description",
      "isActive",
    ]);

    // Build updates with normalization
    const updates = {};
    if (incoming.name != null) updates.name = String(incoming.name).trim();

    if (incoming.price != null) {
      const p = Number(incoming.price);
      if (Number.isNaN(p) || p < 0) {
        return res
          .status(400)
          .json({ message: "price must be a non-negative number" });
      }
      updates.price = p;
    }

    if (incoming.category != null)
      updates.category = String(incoming.category).trim();
    if (incoming.description != null)
      updates.description = String(incoming.description);
    if (incoming.image != null) updates.image = String(incoming.image).trim();
    if (incoming.isActive != null)
      updates.isActive = Boolean(incoming.isActive);

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json(product);
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to update product", error: e.message });
  }
}

// DELETE /api/admin/deleteProduct/:id
export async function deleteProduct(req, res) {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    // Return images so the client (or a job) can optionally clean them up on Cloudinary
    res.json({
      message: "Product deleted",
      deletedId: id,
      images: product.images || [],
    });
  } catch (e) {
    res
      .status(500)
      .json({ message: "Failed to delete product", error: e.message });
  }
}

/** ---------------- Orders ---------------- */
// GET /api/admin/listOrders?status=&page=&limit=
export async function listOrders(req, res) {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = String(status);

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "name email role")
        .populate("products.product", "name price image"),
      Order.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (e) {
    res
      .status(500)
      .json({ message: "Failed to list orders", error: e.message });
  }
}

export async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    const order = await Order.findById(id)
      .populate("user", "name email role")
      .populate("products.product", "name price image category isActive")
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(order);
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to load order", error: e.message });
  }
}

// PATCH /api/admin/updateOrderStatus/:id  { status: "pending|processing|delivered|cancelled" }
export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: "status is required" });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const allowedNext = nextStatusOf(order.status);
    if (status !== allowedNext) {
      return res.status(400).json({
        message: `Only next status allowed: ${allowedNext || "none"}`,
      });
    }

    order.status = status;
    await order.save(); // triggers pre('save') to stamp statusTimestamps

    const populated = await order
      .populate("user", "name email role")
      .populate("products.product", "name price image");
    return res.json(populated);
  } catch (e) {
    res
      .status(500)
      .json({ message: "Failed to update order status", error: e.message });
  }
}

/** ---------------- Users ---------------- */
// GET /api/admin/listUsers?q=&role=&page=&limit=
export async function listUsers(req, res) {
  try {
    const { q, role, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (q)
      filter.$or = [
        { name: { $regex: String(q), $options: "i" } },
        { email: { $regex: String(q), $options: "i" } },
      ];
    if (role) filter.role = String(role);

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      User.find(filter).sort("-createdAt").skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to list users", error: e.message });
  }
}

// DELETE /api/admin/deleteUser/:id
export async function deleteUser(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    // Return images so the client (or a job) can optionally clean them up on Cloudinary
    return res.json({ message: "User deleted", deletedId: id });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to delete user", error: e.message });
  }
}

/** ---------------- Stocks ---------------- **/

// GET /api/admin/listStocks
export async function listStocks(_req, res) {
  try {
    const items = await Stock.find({})
      .sort("-createdAt")
      .populate("productId", "name price image category isActive") // optional, but handy
      .lean();

    return res.json({
      items,
      total: items.length,
      page: 1,
      pages: 1,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to list stocks", error: e.message });
  }
}

// POST /api/admin/createStock
// expects: { productId, region, quantity? }
export async function createStock(req, res) {
  try {
    const { productId, region, quantity = 0 } = req.body || {};

    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Valid productId is required" });
    }
    if (!region || typeof region !== "string") {
      return res.status(400).json({ message: "region is required" });
    }

    // optional: verify product exists
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({ message: "Product not found" });
    }

    const qtyNum = Number(quantity);
    if (Number.isNaN(qtyNum) || qtyNum < 0) {
      return res
        .status(400)
        .json({ message: "quantity must be a non-negative number" });
    }

    const doc = await Stock.create({
      productId,
      region: region.trim().toLowerCase(), // normalize like "north","center","south"
      quantity: qtyNum,
    });

    return res.status(201).json(doc);
  } catch (e) {
    // Handle unique index (productId + region) conflict
    if (e && e.code === 11000) {
      return res
        .status(409)
        .json({ message: "Stock for this product and region already exists" });
    }
    return res
      .status(500)
      .json({ message: "Failed to create stock", error: e.message });
  }
}

// PATCH /api/admin/updateStockQty/:id
// expects: { quantity }
export async function updateStockQty(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid stock id" });
    }

    const { quantity } = req.body || {};
    const qtyNum = Number(quantity);
    if (quantity == null || Number.isNaN(qtyNum) || qtyNum < 0) {
      return res
        .status(400)
        .json({ message: "quantity must be a non-negative number" });
    }

    const updated = await Stock.findByIdAndUpdate(
      id,
      { quantity: qtyNum },
      { new: true, runValidators: true }
    ).populate("productId", "name price image category isActive");

    if (!updated)
      return res.status(404).json({ message: "Stock record not found" });
    return res.json(updated);
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to update stock", error: e.message });
  }
}

// DELETE /api/admin/deleteStock/:id
export async function deleteStock(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid stock id" });
    }

    const deleted = await Stock.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ message: "Stock record not found" });

    return res.json({ message: "Stock deleted", deletedId: id });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to delete stock", error: e.message });
  }
}

// --- NEW: advance one order to the next status ---
export async function advanceOrderStatus(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    // Read current status once
    const found = await Order.findById(id).select({ status: 1 }).lean();
    if (!found) return res.status(404).json({ message: "Order not found" });

    const current = found.status;
    const next = nextStatusOf(current);
    if (!next) {
      return res.status(409).json({ message: "Order is already terminal" });
    }

    const now = new Date();
    const set = {
      status: next,
      updatedAt: now,
    };
    set[`statusTimestamps.${next}`] = now;

    // Atomic claim: only update if status is still 'current'
    const updated = await Order.findOneAndUpdate(
      { _id: id, status: current },
      { $set: set },
      { new: true } // return the updated document
    )
      .populate("user", "name email role")
      .populate("products.product", "name price image");

    if (!updated) {
      return res.status(409).json({
        message:
          "Order status changed by another process. Refresh and try again.",
      });
    }

    return res.json({
      order: updated,
      prevStatus: current,
      nextStatus: next,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to advance order", error: e.message });
  }
}

// --- NEW: advance many selected orders ---
export async function advanceManyOrderStatuses(req, res) {
  try {
    const body = req.body || {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) {
      return res.status(400).json({ message: "ids array is required" });
    }
    if (ids.length > 200) {
      return res.status(400).json({ message: "Too many ids (max 200)" });
    }

    const results = { ok: [], skipped: [] };

    // Process sequentially to avoid large bursts; keeps logic simple & deterministic
    for (const rawId of ids) {
      const id = String(rawId);
      if (!mongoose.isValidObjectId(id)) {
        results.skipped.push({ id, reason: "invalid_id" });
        continue;
      }

      const found = await Order.findById(id).select({ status: 1 }).lean();
      if (!found) {
        results.skipped.push({ id, reason: "not_found" });
        continue;
      }

      const current = found.status;
      const next = nextStatusOf(current);
      if (!next) {
        results.skipped.push({ id, reason: "terminal" });
        continue;
      }

      const now = new Date();
      const set = { status: next, updatedAt: now };
      set[`statusTimestamps.${next}`] = now;

      const updated = await Order.findOneAndUpdate(
        { _id: id, status: current },
        { $set: set },
        { new: true }
      ).select({ _id: 1 });

      if (updated) {
        results.ok.push(id);
      } else {
        results.skipped.push({ id, reason: "race" });
      }
    }

    return res.json(results);
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to advance orders", error: e.message });
  }
}

// --- NEW: cancel an order (optional reason) ---
export async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const reasonRaw = (req.body && req.body.reason) || "";
    const reason =
      typeof reasonRaw === "string" && reasonRaw.trim()
        ? reasonRaw.trim()
        : "Cancelled by admin";

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    // Check existence and terminality
    const found = await Order.findById(id).select({ status: 1 }).lean();
    if (!found) return res.status(404).json({ message: "Order not found" });
    if (found.status === "delivered" || found.status === "cancelled") {
      return res
        .status(409)
        .json({ message: "Order is terminal and cannot be cancelled" });
    }

    const now = new Date();
    const set = {
      status: "cancelled",
      updatedAt: now,
    };
    set["statusTimestamps.cancelled"] = now;

    const updated = await Order.findOneAndUpdate(
      { _id: id, status: { $nin: ["delivered", "cancelled"] } },
      {
        $set: set,
        $push: { adminNotes: { at: now, note: reason } },
      },
      { new: true }
    )
      .populate("user", "name email role")
      .populate("products.product", "name price image");

    if (!updated) {
      // race: became terminal between check and update
      return res
        .status(409)
        .json({ message: "Order is terminal and cannot be cancelled" });
    }

    return res.json({ order: updated, cancelledAt: now, reason });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to cancel order", error: e.message });
  }
}
