// backend/app.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./utils/db.js";

// Load environment variables
dotenv.config();

// Create express app
const app = express();

connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes will go here later ---
import authRoutes from "./routes/auth.routes.js"; // to be created
// import productRoutes from "./routes/product.routes.js"; // to be created
// import orderRoutes from "./routes/order.routes.js"; // to be created
// import adminRoutes from "./routes/admin.routes.js"; // to be created

// Reference route structure — not active yet
app.use("/api/auth", authRoutes);
// app.use("/api/products", productRoutes);
// app.use("/api/orders", orderRoutes);
// app.use("/api/admin", adminRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Simple Market API is running...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
