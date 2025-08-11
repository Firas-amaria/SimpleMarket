// utils/jwt.js
import jwt from "jsonwebtoken";

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES,
  JWT_REFRESH_EXPIRES,
} = process.env;

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    JWT_ACCESS_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES }
  );
}

export function signRefreshToken(user) {
  // include tokenVersion so you can invalidate all refresh tokens by bumping the version
  return jwt.sign(
    { sub: user._id.toString(), tokenVersion: user.tokenVersion },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}
