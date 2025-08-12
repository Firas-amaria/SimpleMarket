// backend/app.js
import "dotenv/config"; // ← load envs BEFORE anything else
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./utils/db.js";

// --- routes ---
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import marketRoutes from "./routes/market.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Trust reverse proxies (Render, Vercel) so secure cookies & IPs work correctly
app.set("trust proxy", 1);

// Connect DB early, fail fast if connection breaks
await connectDB();

// ---- CORS (credentials + limited origins) ----
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN, // e.g., https://simple-market.vercel.app
  "http://localhost:3000", // CRA dev
  "http://localhost:5173", // Vite dev (in case)
].filter(Boolean);

// If you want to allow multiple origins with credentials, use a function:
app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin (server-to-server) or tools with no Origin header
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // allow cookies (refresh token)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
  })
);

// ---- Core middleware ----
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- Health check (no auth) ----
app.get("/", (_req, res) => {
  res.send("Simple Market API is running…");
});

// ---- API routes ----
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/user", userRoutes);

// 404 for API routes (after all mounts)
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// ---- Error handler (last) ----
app.use((err, _req, res, _next) => {
  // Avoid leaking internals; include detail in dev
  const status = err.status || 500;
  const payload = { message: err.message || "Server error" };
  if (!isProd && err.stack) payload.stack = err.stack;
  console.error(err);
  res.status(status).json(payload);
});

// ---- Start server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("CORS allowed origins:", allowedOrigins);
});
