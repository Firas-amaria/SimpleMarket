// backend/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    profileImage: { type: String },
    region: { type: String, enum: ["east", "west"], required: true }, // 👈 enforce canon regions
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
