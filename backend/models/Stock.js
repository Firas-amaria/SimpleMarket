// backend/models/Stock.js
const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, default: 0, min: 0 },
    region: { type: String, index: true }, // e.g., "north", "center", "south"
  },
  { timestamps: true }
);
stockSchema.index({ productId: 1, region: 1 }, { unique: true });

module.exports = mongoose.model("Stock", stockSchema);
