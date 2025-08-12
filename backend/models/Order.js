// backend/models/Order.js
const mongoose = require("mongoose");
const Product = require("./Product"); // used to compute total from current prices

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Minimal line items: product + quantity only (no price snapshot)
    products: {
      type: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: 50, // grams
            validate: {
              validator: (v) => Number.isInteger(v) && v % 50 === 0,
              message:
                "Quantity must be an integer number of grams in 50g steps",
            },
          },
        },
      ],
      validate: [
        (arr) => Array.isArray(arr) && arr.length > 0,
        "Order must have at least one item",
      ],
      required: true,
    },

    // Computed from Product.price * quantity (authoritative on the backend)
    totalAmount: { type: Number, required: true, min: 0 },

    // Snapshot the user's region at checkout (set this in your controller from req.user.region)
    region: { type: String, required: true, index: true },

    shippingAddress: {
      fullName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      region: String,
      postalCode: String,
      notes: String,
    },

    paymentSnapshot: {
      brand: String,
      last4: String,
      expMonth: Number,
      expYear: Number,
      nameOnCard: String,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    // Map of status -> timestamp, helps your auto-progress & auditing
    statusTimestamps: { type: Map, of: Date, default: {} },

    // Admin notes log
    adminNotes: [
      {
        at: { type: Date, default: Date.now },
        note: { type: String, trim: true },
      },
    ],

    // Optional friendly number for UI/receipts
    orderNumber: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Compute totalAmount from current Product.price before validation
orderSchema.pre("validate", async function (next) {
  try {
    if (!this.products || this.products.length === 0) {
      return next(new Error("Order must have at least one item"));
    }

    // Fetch prices for all products in the order
    const ids = this.products.map((p) => p.product);
    const found = await Product.find({ _id: { $in: ids }, isActive: true })
      .select({ _id: 1, price: 1 })
      .lean();

    // p.price is *per 100 grams*
    const pricePer100gById = new Map(
      found.map((p) => [String(p._id), p.price])
    );

    let sum = 0;
    for (const item of this.products) {
      const key = String(item.product);
      const pricePer100g = pricePer100gById.get(key);
      if (pricePer100g == null) {
        return next(new Error("One or more products not found or inactive"));
      }
      if (item.quantity <= 0) {
        return next(new Error("Quantity must be greater than zero"));
      }
      // item.quantity is in grams; price is per 100 g
      sum += (pricePer100g / 100) * item.quantity;
    }

    // Round to 2 decimals since we're using floats (global price)
    this.totalAmount = Math.round(sum * 100) / 100;

    // Ensure statusTimestamps has 'pending' on first creation
    if (this.isNew) {
      const map = this.statusTimestamps || new Map();
      if (!map.get("pending")) map.set("pending", new Date());
      this.statusTimestamps = map;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// If status changes, stamp its timestamp if not already set
orderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    const map = this.statusTimestamps || new Map();
    if (!map.get(this.status)) map.set(this.status, new Date());
    this.statusTimestamps = map;
  }

  // Generate friendly order number once
  if (!this.orderNumber) {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.orderNumber = `ORD-${ymd}-${rand}`;
  }
  next();
});

// Helpful dashboard indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ region: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, "statusTimestamps.pending": 1 });
orderSchema.index({ status: 1, "statusTimestamps.confirmed": 1 });
orderSchema.index({ status: 1, "statusTimestamps.preparing": 1 });
orderSchema.index({ status: 1, "statusTimestamps.out_for_delivery": 1 });

module.exports = mongoose.model("Order", orderSchema);
