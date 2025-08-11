// middlewares/auth.js
import { verifyAccessToken } from "../utils/jwt.js";

const AUTH_DEBUG = false;

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (AUTH_DEBUG) {
    const short = token ? `${token.slice(0, 12)}…` : "<none>";
    console.log(
      `[authRequired] ${req.method} ${req.originalUrl} token: ${short}`
    );
  }

  if (!token) return res.status(401).json({ message: "Missing access token" });

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, _id: payload.sub, role: payload.role };
    if (AUTH_DEBUG) {
      console.log("[authRequired] verified payload:", {
        sub: payload?.sub,
        role: payload?.role,
        exp: payload?.exp,
      });
    }
    next();
  } catch (e) {
    if (AUTH_DEBUG) console.error("[authRequired] verify failed:", e?.message);
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}
