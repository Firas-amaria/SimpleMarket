// ESM file
import { Router } from "express";
import { authRequired, requireAdmin } from "../middlewares/auth.js";
import {
  getDashboardStats,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listOrders,
  getOrderById,
  updateOrderStatus,
  listUsers,
  deleteUser,
  listStocks,
  createStock,
  updateStockQty,
  deleteStock,
  // NEW:
  advanceOrderStatus,
  advanceManyOrderStatuses,
  cancelOrder,
} from "../controllers/admin.controller.js";

const router = Router();

// All admin routes require auth + admin role
router.use(authRequired, requireAdmin);

// Dashboard
router.get("/dashboardStats", getDashboardStats);

// Products (kept your original paths to avoid breaking the UI)
router.get("/listProducts", listProducts);
router.get("/getProduct/:id", getProduct);
router.post("/createProduct", createProduct);
router.put("/updateProduct/:id", updateProduct);
router.delete("/deleteProduct/:id", deleteProduct);

// Orders
router.get("/listOrders", listOrders);
router.get("/getOrderById/:id", getOrderById);
router.patch("/updateOrderStatus/:id", updateOrderStatus);

// NEW admin actions for status control
router.post("/advanceOrderStatus/:id", advanceOrderStatus);
router.post("/advanceManyOrderStatuses", advanceManyOrderStatuses);
router.post("/cancelOrder/:id", cancelOrder);

// Users
router.get("/listUsers", listUsers);
router.delete("/deleteUser/:id", deleteUser);

// Stocks
router.get("/listStocks", listStocks);
router.post("/createStock", createStock);
router.patch("/updateStockQty/:id", updateStockQty);
router.delete("/deleteStock/:id", deleteStock);

export default router;
