// ESM file
import { Router } from "express";
import { verifyToken, isAdmin } from "../middlewares/auth.js";
import {
  getDashboardStats,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listOrders,
  updateOrderStatus,
  listUsers,
} from "../controllers/admin.controller.js";

const router = Router();

router.use(verifyToken, isAdmin);

// Dashboard
router.get("/getDashboardStats", getDashboardStats);

// Products
router.get("/listProducts", listProducts);
router.get("/getProduct/:id", getProduct);
router.post("/createProduct", createProduct);
router.put("/updateProduct/:id", updateProduct);
router.delete("/deleteProduct/:id", deleteProduct);

// Orders
router.get("/listOrders", listOrders);
router.patch("/updateOrderStatus/:id", updateOrderStatus);

// Users
router.get("/listUsers", listUsers);

export default router;
