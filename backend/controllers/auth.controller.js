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
// --- helper: parse "45m", "2h", "7d" to milliseconds (minimal) ---
function parseDurationToMs(str) {
  if (!str) return undefined;
  const m = /^(\d+)\s*([smhd])$/.exec(String(str).trim());
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2];
  const mult =
    unit === "s"
      ? 1000
      : unit === "m"
      ? 60 * 1000
      : unit === "h"
      ? 60 * 60 * 1000
      : /* d */ 24 * 60 * 60 * 1000;
  return n * mult;
}
const REFRESH_COOKIE_MAX_AGE =
  parseDurationToMs(process.env.JWT_REFRESH_EXPIRES) ??
  30 * 24 * 60 * 60 * 1000;

// One place for your cookie options
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE,
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

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // ✅ use the same token helpers as register
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    const sanitized = {
      id: user._id, // keep id naming consistent with register
      name: user.name,
      email: user.email,
      role: user.role,
      region: user.region,
      profileImage: user.profileImage,
    };

    return res.json({ accessToken, user: sanitized }); // ✅ same shape as register
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return res
      .status(500)
      .json({ message: "Login failed", detail: String(err?.message || err) });
  }
}

// controllers/auth.controller.js (inside export async function refresh)
export async function refresh(req, res, next) {
  try {
    // Basic CSRF guard: only allow JS/XHR from your site to hit refresh
    const xrw = req.get("X-Requested-With");
    if (!xrw || xrw.toLowerCase() !== "xmlhttprequest") {
      return res.status(400).json({ message: "Bad refresh request" });
    }

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

    if (payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: "Refresh token revoked" });
    }

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
