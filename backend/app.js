// backend/app.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./utils/db.js";

// Load environment variables
dotenv.config();

const isProd = process.env.NODE_ENV === "production";
// Create express app
const app = express();

app.set("trust proxy", 1);
connectDB();

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN, // e.g. https://simple-market.vercel.app
  "http://localhost:3000", // dev (Vite)
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Routes will go here later ---
import authRoutes from "./routes/auth.routes.js"; // to be created
// import productRoutes from "./routes/product.routes.js"; // to be created
// import orderRoutes from "./routes/order.routes.js"; // to be created
import adminRoutes from "./routes/admin.routes.js"; // to be created

// Reference route structure — not active yet
app.use("/api/auth", authRoutes);
// app.use("/api/products", productRoutes);
// app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Simple Market API is running...");
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Server error" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
