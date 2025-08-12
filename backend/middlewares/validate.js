// backend/middlewares/validate.js
import mongoose from "mongoose";

export const validate = (schemaName) => (req, res, next) => {
  try {
    switch (schemaName) {
      // ---------- Products ----------
      case "listProducts": {
        const { minPrice, maxPrice, inStock } = req.query;
        if (minPrice !== undefined && isNaN(Number(minPrice))) {
          return res.status(400).json({ message: "minPrice must be a number" });
        }
        if (maxPrice !== undefined && isNaN(Number(maxPrice))) {
          return res.status(400).json({ message: "maxPrice must be a number" });
        }
        if (
          inStock !== undefined &&
          !["true", "false"].includes(String(inStock))
        ) {
          return res
            .status(400)
            .json({ message: "inStock must be true/false" });
        }
        break;
      }

      case "getProductById": {
        if (!mongoose.isValidObjectId(req.params.id)) {
          return res.status(400).json({ message: "Invalid product id" });
        }
        break;
      }

      // ---------- Availability ----------
      case "getAvailability": {
        const { productId, region } = req.query;
        if (!mongoose.isValidObjectId(productId)) {
          return res.status(400).json({ message: "Invalid productId" });
        }
        if (!region) {
          return res.status(400).json({ message: "region is required" });
        }
        break;
      }

      // ---------- Orders (Customer) ----------
      case "createOrder": {
        const { items, region, shippingAddress, payment } = req.body || {};

        // Region must NOT be sent by client anymore; server derives from user
        if (region !== undefined) {
          return res
            .status(400)
            .json({ message: "region must not be provided" });
        }

        if (!Array.isArray(items) || items.length === 0) {
          return res
            .status(400)
            .json({ message: "items must be a non-empty array" });
        }

        for (const it of items) {
          if (typeof it !== "object") {
            return res
              .status(400)
              .json({ message: "Each item must be an object" });
          }
          if (!mongoose.isValidObjectId(it.productId)) {
            return res.status(400).json({ message: "Invalid productId" });
          }
          const q = Number(it.quantity);
          if (!Number.isFinite(q) || q <= 0 || q % 50 !== 0) {
            return res.status(400).json({
              message: "quantity must be a positive integer in 50g steps",
            });
          }
        }

        if (shippingAddress !== undefined) {
          if (typeof shippingAddress !== "object") {
            return res
              .status(400)
              .json({ message: "shippingAddress must be an object" });
          }
          const { line1, city, postalCode, line2, notes } = shippingAddress;
          if (!line1 || !city) {
            return res
              .status(400)
              .json({
                message: "shippingAddress.line1 and .city are required",
              });
          }
          for (const s of [line1, city, postalCode, line2, notes]) {
            if (s !== undefined && typeof s !== "string") {
              return res
                .status(400)
                .json({ message: "shippingAddress fields must be strings" });
            }
          }
        }

        if (payment !== undefined) {
          if (typeof payment !== "object") {
            return res
              .status(400)
              .json({ message: "payment must be an object" });
          }
          const {
            brand,
            last4,
            expMonth,
            expYear,
            nameOnCard,
            cardNumber,
            cvc,
          } = payment;

          if (cardNumber || cvc) {
            return res
              .status(400)
              .json({ message: "cardNumber and cvc are not allowed" });
          }
          if (brand !== undefined && typeof brand !== "string") {
            return res
              .status(400)
              .json({ message: "payment.brand must be a string" });
          }
          if (nameOnCard !== undefined && typeof nameOnCard !== "string") {
            return res
              .status(400)
              .json({ message: "payment.nameOnCard must be a string" });
          }
          if (last4 !== undefined && !/^\d{4}$/.test(String(last4))) {
            return res
              .status(400)
              .json({ message: "payment.last4 must be 4 digits" });
          }
          if (
            expMonth !== undefined &&
            !(Number(expMonth) >= 1 && Number(expMonth) <= 12)
          ) {
            return res
              .status(400)
              .json({ message: "payment.expMonth must be between 1 and 12" });
          }
          if (expYear !== undefined && !(Number(expYear) >= 2024)) {
            return res
              .status(400)
              .json({
                message: "payment.expYear must be greater or equal to 2024",
              });
          }
        }
        break;
      }

      case "listMyOrders": {
        // Optional: add status enum check if you want to filter strictly
        break;
      }

      case "getMyOrderById": {
        if (!mongoose.isValidObjectId(req.params.id)) {
          return res.status(400).json({ message: "Invalid order id" });
        }
        break;
      }

      default:
        break;
    }

    next();
  } catch (e) {
    next(e);
  }
};
