// backend/app.js
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

// Load environment variables
dotenv.config();

// Create express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// --- Routes will go here later ---
import authRoutes from "./routes/auth.routes.js"; // to be created
import productRoutes from "./routes/product.routes.js"; // to be created
import orderRoutes from "./routes/order.routes.js"; // to be created
import adminRoutes from "./routes/admin.routes.js"; // to be created

// Reference route structure — not active yet
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Fruit Market API is running...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
