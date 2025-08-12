// backend/routes/user.routes.js
import { Router } from "express";
import { authRequired } from "../middlewares/auth.js";
import {
  getMyDetails,
  updateMyDetails,
} from "../controllers/user.controller.js";

const router = Router();

// Returns/updates ONLY the saved delivery address (no payment is stored)
router.get("/getMyDetails", authRequired, getMyDetails);
router.put("/updateMyDetails", authRequired, updateMyDetails);

export default router;
