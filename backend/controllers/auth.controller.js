// controllers/auth.controller.js
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

const isProd = process.env.NODE_ENV === "production";

// One place for your cookie options
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd, // true in production (HTTPS)
    sameSite: isProd ? "none" : "lax", // "none" if frontend is on a different domain with HTTPS
    path: "/",
    // maxAge in ms; keep it shorter than or equal to your JWT_REFRESH_EXPIRES
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

function setRefreshCookie(res, rt) {
  res.cookie("rt", rt, refreshCookieOptions());
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "name, email, password are required" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(409).json({ message: "Email already in use" });

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hash,
      role: "customer",
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

// Rotate refresh token and issue a new access token
export async function refresh(req, res, next) {
  try {
    const rt = req.cookies?.rt;
    if (!rt) return res.status(401).json({ message: "Missing refresh token" });

    let payload;
    try {
      payload = verifyRefreshToken(rt);
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "User not found" });

    // Token-wide invalidation check
    if (payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: "Refresh token revoked" });
    }

    // Optional rotation strategy:
    // - Keep the same tokenVersion for multi-device support
    // - If you want "logout everywhere" or revoke-all: increment user.tokenVersion

    const newAccess = signAccessToken(user);
    const newRefresh = signRefreshToken(user);
    setRefreshCookie(res, newRefresh);

    res.json({
      accessToken: newAccess,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    // Clear cookie
    res.clearCookie("rt", { ...refreshCookieOptions(), maxAge: 0 });

    // If you want to revoke ALL existing refresh tokens for this user (logout-all):
    // const userId = req.user?.id   <-- if you require auth for logout
    // await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });

    return res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}
