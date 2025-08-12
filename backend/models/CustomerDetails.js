// backend/models/CustomerDetails.js
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const customerDetailsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      index: true,
      required: true,
    },
    address: addressSchema, // address ONLY
  },
  { timestamps: true }
);

export default mongoose.model("CustomerDetails", customerDetailsSchema);
