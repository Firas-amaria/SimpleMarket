// backend/middleware/validate.js
import mongoose from "mongoose";

export const validate = (schemaName) => (req, res, next) => {
  try {
    switch (schemaName) {
      case "listProducts": {
        const { minPrice, maxPrice, inStock } = req.query;
        if (minPrice && isNaN(Number(minPrice)))
          return res.status(400).json({ message: "minPrice must be a number" });
        if (maxPrice && isNaN(Number(maxPrice)))
          return res.status(400).json({ message: "maxPrice must be a number" });
        if (inStock && !["true", "false"].includes(String(inStock)))
          return res
            .status(400)
            .json({ message: "inStock must be true/false" });
        break;
      }
      case "getProduct": {
        if (!mongoose.isValidObjectId(req.params.id))
          return res.status(400).json({ message: "Invalid product id" });
        break;
      }
      case "availability": {
        const { productId, region } = req.query;
        if (!mongoose.isValidObjectId(productId))
          return res.status(400).json({ message: "Invalid productId" });
        if (!region)
          return res.status(400).json({ message: "region is required" });
        break;
      }
      case "createOrder": {
        const { items, region } = req.body;
        if (!region)
          return res.status(400).json({ message: "region is required" });
        if (!Array.isArray(items) || items.length === 0)
          return res.status(400).json({ message: "items are required" });

        for (const it of items) {
          if (!mongoose.isValidObjectId(it.productId))
            return res.status(400).json({ message: "Invalid productId" });
          const q = Number(it.quantity);
          if (!Number.isFinite(q) || q <= 0)
            return res.status(400).json({ message: "Invalid quantity" });
        }
        break;
      }
      case "listMyOrders": {
        // Optional: restrict to enum statuses defined in Order.js
        break;
      }
      case "getMyOrder": {
        if (!mongoose.isValidObjectId(req.params.id))
          return res.status(400).json({ message: "Invalid order id" });
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
