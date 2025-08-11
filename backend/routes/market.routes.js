// backend/routes/market.routes.js
import { Router } from "express";
import {
  listProducts,
  getProductById,
  listRegions,
  getAvailability,
  createOrder,
  listMyOrders,
  getMyOrderById,
} from "../controllers/market.controller.js";
import { authRequired } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

// ---------- Products (public) ----------
router.get("/products", validate("listProducts"), listProducts);
router.get("/products/:id", validate("getProduct"), getProductById);

// ---------- Regions (public) ----------
router.get("/regions", listRegions);

// ---------- Availability (public) ----------
router.get("/availability", validate("availability"), getAvailability);

// ---------- Orders (customer) ----------
router.post("/orders", authRequired, validate("createOrder"), createOrder);
router.get("/orders", authRequired, validate("listMyOrders"), listMyOrders);
router.get("/orders/:id", authRequired, validate("getMyOrder"), getMyOrderById);

export default router;
