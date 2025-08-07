import express from "express";
import { registerUser, loginUser } from "../controllers/auth.controller.js";
import upload from "../middlewares/multer.js";
import { uploadProfileImage } from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", registerUser);

// POST /api/auth/login
router.post("/login", loginUser);

//POST /api/auth/upload-profile
router.post(
  "/upload-profile",
  verifyToken,
  upload.single("image"),
  uploadProfileImage
);
export default router;
