import express from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  increaseQuantity,
  decreaseQuantity,
  validateAddToCart,
  validateUpdateCart,
} from "../controllers/cartController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// All cart routes require user authentication
router.use(authenticateUser);

// Add item to cart
router.post("/add", validateAddToCart, addToCart);

// Get user's cart
router.get("/", getCart);

// Get cart summary (for header display)
router.get("/summary", getCartSummary);

// Increase cart item quantity by 1
router.put("/:id/increase", increaseQuantity);

// Decrease cart item quantity by 1
router.put("/:id/decrease", decreaseQuantity);

// Update cart item quantity (manual quantity)
router.put("/:id", validateUpdateCart, updateCartItem);

// Remove item from cart
router.delete("/:id", removeFromCart);

// Clear entire cart
router.delete("/", clearCart);

export default router;
