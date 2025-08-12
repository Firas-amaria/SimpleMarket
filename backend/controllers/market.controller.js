// backend/controllers/market.controller.js
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Stock from "../models/Stock.js"; // expects: { productId, region, quantity } with unique index (productId, region)
import Order from "../models/Order.js";

function parsePagination(query) {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "12", 10), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildProductSort(sort) {
  switch (sort) {
    case "price-asc":
      return { price: 1, _id: 1 };
    case "price-desc":
      return { price: -1, _id: 1 };
    case "newest":
      return { createdAt: -1, _id: -1 };
    default:
      return { createdAt: -1, _id: -1 };
  }
}

// ---------------- Products ----------------

export async function listProducts(req, res) {
  try {
    const { q, region, category, minPrice, maxPrice, sort, inStock } =
      req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const match = { isActive: true };
    if (category) match.category = category;

    // Regex search (no text index required). Safe-escape user input.
    if (q) {
      const rx = new RegExp(
        q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      match.$or = [{ name: rx }, { description: rx }];
    }

    if (minPrice || maxPrice) {
      match.price = {};
      if (minPrice) match.price.$gte = Number(minPrice);
      if (maxPrice) match.price.$lte = Number(maxPrice);
    }

    const needStockJoin = region || inStock === "true";
    if (needStockJoin) {
      const pipeline = [
        { $match: match },
        {
          $lookup: {
            from: "stocks",
            let: { pid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$productId", "$$pid"] },
                  ...(region ? { region } : {}),
                },
              },
            ],
            as: "stockRows",
          },
        },
        { $addFields: { availableQty: { $sum: "$stockRows.quantity" } } },
      ];

      if (inStock === "true")
        pipeline.push({ $match: { availableQty: { $gt: 0 } } });

      pipeline.push(
        { $sort: buildProductSort(sort) },
        { $skip: skip },
        { $limit: limit }
      );

      const [items, totalArr] = await Promise.all([
        Product.aggregate(pipeline),
        Product.aggregate([
          { $match: match },
          {
            $lookup: {
              from: "stocks",
              let: { pid: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$productId", "$$pid"] },
                    ...(region ? { region } : {}),
                  },
                },
              ],
              as: "stockRows",
            },
          },
          { $addFields: { availableQty: { $sum: "$stockRows.quantity" } } },
          ...(inStock === "true"
            ? [{ $match: { availableQty: { $gt: 0 } } }]
            : []),
          { $count: "total" },
        ]),
      ]);

      const total = totalArr[0]?.total || 0;
      return res.json({ items, total, page, pages: Math.ceil(total / limit) });
    }

    // Fast path: no stock join
    const [items, total] = await Promise.all([
      Product.find(match)
        .sort(buildProductSort(sort))
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(match),
    ]);
    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("listProducts error", err);
    return res.status(500).json({ message: "Failed to list products" });
  }
}

export async function getProductById(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid product id" });

    const [product, stock] = await Promise.all([
      Product.findById(id).lean(),
      Stock.find({ productId: id }).lean(),
    ]);
    if (!product || !product.isActive)
      return res.status(404).json({ message: "Product not found" });

    const stockByRegion = stock.map((s) => ({
      region: s.region,
      quantity: s.quantity,
    }));
    return res.json({ ...product, stockByRegion });
  } catch (err) {
    console.error("getProductById error", err);
    return res.status(500).json({ message: "Failed to load product" });
  }
}

// ---------------- Regions ----------------

export async function listRegions(_req, res) {
  try {
    const regions = await Stock.distinct("region");
    return res.json({ items: regions.sort() });
  } catch (err) {
    console.error("listRegions error", err);
    return res.status(500).json({ message: "Failed to list regions" });
  }
}

// ---------------- Availability ----------------

export async function getAvailability(req, res) {
  try {
    const { productId, region } = req.query;
    if (!mongoose.isValidObjectId(productId))
      return res.status(400).json({ message: "Invalid productId" });
    if (!region) return res.status(400).json({ message: "region is required" });

    const row = await Stock.findOne({ productId, region }).lean();
    return res.json({ productId, region, availableQty: row?.quantity ?? 0 });
  } catch (err) {
    console.error("getAvailability error", err);
    return res.status(500).json({ message: "Failed to check availability" });
  }
}

// ---------------- Orders (Customer) ----------------

export async function createOrder(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user?.id || req.user?._id;
    const { items, shippingAddress, payment } = req.body;

    if (!userId) {
      await session.abortTransaction();
      return res.status(401).json({ message: "Auth required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Order must have at least one item" });
    }

    // --- Authoritative region from the user document ---
    // If you prefer to keep region from body, remove this fetch.
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId).select({ region: 1 }).lean();
    if (!user?.region) {
      await session.abortTransaction();
      return res.status(400).json({ message: "User has no region set" });
    }
    const region = String(user.region).toLowerCase();

    // --- Validate + decrement stock atomically ---
    const productIds = items.map((i) => i.productId);
    const active = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    })
      .select({ _id: 1 })
      .session(session)
      .lean();
    const activeSet = new Set(active.map((p) => String(p._id)));

    for (const it of items) {
      const pid = String(it.productId);
      const qty = Number(it.quantity);
      if (
        !mongoose.isValidObjectId(pid) ||
        !Number.isFinite(qty) ||
        qty <= 0 ||
        qty % 50 !== 0
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Invalid product or quantity (50g steps required)",
        });
      }
      if (!activeSet.has(pid)) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "Product not found or inactive" });
      }
      const updated = await Stock.findOneAndUpdate(
        { productId: pid, region, quantity: { $gte: qty } },
        { $inc: { quantity: -qty } },
        { new: true, session }
      );
      if (!updated) {
        await session.abortTransaction();
        return res.status(409).json({
          message: `Insufficient stock for product ${pid} in ${region}`,
        });
      }
    }

    // --- Sanitize snapshots (address + payment) ---
    const shippingAddressSnapshot = shippingAddress
      ? {
          line1: shippingAddress.line1 ?? "",
          line2: shippingAddress.line2 ?? "",
          city: shippingAddress.city ?? "",
          postalCode: shippingAddress.postalCode ?? "",
          notes: shippingAddress.notes ?? "",
          // DO NOT include full name / phone / region here (those live on User)
        }
      : undefined;

    const paymentSnapshot = payment
      ? {
          brand: payment.brand ?? "",
          last4: payment.last4 ? String(payment.last4).slice(-4) : "",
          expMonth:
            payment.expMonth !== undefined
              ? Number(payment.expMonth)
              : undefined,
          expYear:
            payment.expYear !== undefined ? Number(payment.expYear) : undefined,
          nameOnCard: payment.nameOnCard ?? "",
        }
      : undefined;

    // Defensive: never accept PAN/CVC even if client sends them
    if (payment?.cardNumber || payment?.cvc) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Payment card number and CVC are not stored" });
    }

    // --- Create order (total computed in Order pre-validate) ---
    const orderDoc = {
      user: userId,
      region,
      status: "pending",
      products: items.map((it) => ({
        product: it.productId,
        quantity: it.quantity,
      })),
      ...(shippingAddressSnapshot
        ? { shippingAddress: shippingAddressSnapshot }
        : {}),
      ...(paymentSnapshot ? { paymentSnapshot } : {}),
    };

    const [created] = await Order.create([orderDoc], { session });
    await session.commitTransaction();
    return res.status(201).json(created);
  } catch (err) {
    console.error("createOrder error", err);
    try {
      await session.abortTransaction();
    } catch {}
    return res.status(500).json({ message: "Failed to create order" });
  } finally {
    session.endSession();
  }
}

export async function listMyOrders(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });
    const { status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const match = { user: userId };
    if (status) match.status = status;

    const [items, total] = await Promise.all([
      Order.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(match),
    ]);

    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("listMyOrders error", err);
    return res.status(500).json({ message: "Failed to list orders" });
  }
}

export async function getMyOrderById(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid order id" });

    const order = await Order.findOne({ _id: id, user: userId }).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(order);
  } catch (err) {
    console.error("getMyOrderById error", err);
    return res.status(500).json({ message: "Failed to load order" });
  }
}
