// backend/models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    category: String,
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 }, // fake stock quantity
    image: { type: String }, // Cloudinary URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
