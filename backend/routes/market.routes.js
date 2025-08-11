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

// ---------- Products ----------
router.get("/listProducts", validate("listProducts"), listProducts);
router.get("/getProductById/:id", validate("getProductById"), getProductById);

// ---------- Regions ----------
router.get("/listRegions", listRegions);

// ---------- Availability ----------
router.get("/getAvailability", validate("getAvailability"), getAvailability);

// ---------- Orders (customer) ----------
router.post("/createOrder", authRequired, validate("createOrder"), createOrder);
router.get(
  "/listMyOrders",
  authRequired,
  validate("listMyOrders"),
  listMyOrders
);
router.get(
  "/getMyOrderById/:id",
  authRequired,
  validate("getMyOrderById"),
  getMyOrderById
);

router.get("/whoami", authRequired, (req, res) => {
  res.json({ user: req.user });
});

export default router;
