// backend/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    profileImage: { type: String }, // Cloudinary URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
