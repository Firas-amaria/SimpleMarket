// ESM file
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";

// Safe field picker
const pick = (obj, keys) =>
  keys.reduce(
    (acc, k) => (obj[k] !== undefined ? ((acc[k] = obj[k]), acc) : acc),
    {}
  );

// Dashboard cards
export async function getDashboardStats(_req, res) {
  try {
    const [products, orders, users, pending, delivered] = await Promise.all([
      Product.countDocuments({}),
      Order.countDocuments({}),
      User.countDocuments({}),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "delivered" }),
    ]);
    res.json({
      products,
      orders,
      users,
      pendingOrders: pending,
      deliveredOrders: delivered,
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load stats", error: e.message });
  }
}

/* ---------- PRODUCTS ---------- */
const PRODUCT_FIELDS = [
  "name",
  "description",
  "category",
  "price",
  "stock",
  "image",
  "region",
  "isActive",
  "featured",
];

export async function listProducts(req, res) {
  try {
    const { q, region, active, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.name = { $regex: q, $options: "i" };
    if (region) filter.region = region;
    if (active !== undefined) filter.isActive = active === "true";

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
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

export async function createProduct(req, res) {
  try {
    const data = pick(req.body, PRODUCT_FIELDS);
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.stock !== undefined) data.stock = Number(data.stock);
    if (data.isActive !== undefined)
      data.isActive = data.isActive === true || data.isActive === "true";
    if (data.featured !== undefined)
      data.featured = data.featured === true || data.featured === "true";

    const created = await Product.create(data);
    res.status(201).json(created);
  } catch (e) {
    res
      .status(400)
      .json({ message: "Failed to create product", error: e.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const data = pick(req.body, PRODUCT_FIELDS);
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.stock !== undefined) data.stock = Number(data.stock);
    if (data.isActive !== undefined)
      data.isActive = data.isActive === true || data.isActive === "true";
    if (data.featured !== undefined)
      data.featured = data.featured === true || data.featured === "true";

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.json(updated);
  } catch (e) {
    res
      .status(400)
      .json({ message: "Failed to update product", error: e.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true });
  } catch (e) {
    res
      .status(400)
      .json({ message: "Failed to delete product", error: e.message });
  }
}

/* ---------- ORDERS ---------- */
const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export async function listOrders(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .populate("products.product", "name image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
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

export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // find order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // short‑circuit if no change
    if (order.status === status && !note) {
      return res.json(order);
    }

    order.status = status;
    if (note) {
      order.adminNotes = order.adminNotes || [];
      order.adminNotes.push({ at: new Date(), note });
    }

    await order.save();

    // optional: populate for UI convenience
    const populated = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("products.product", "name image");

    return res.json(populated);
  } catch (e) {
    // Handle bad ObjectId
    if (e?.name === "CastError") {
      return res.status(400).json({ message: "Invalid order id" });
    }
    return res
      .status(400)
      .json({ message: "Failed to update status", error: e.message });
  }
}

/* ---------- USERS (optional listing) ---------- */
export async function listUsers(req, res) {
  try {
    const { q, role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.name = { $regex: q, $options: "i" };
    if (role) filter.role = role;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
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
