// backend/models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // Snapshot of price at order time
      },
    ],
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
