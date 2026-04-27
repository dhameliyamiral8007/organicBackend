import express from "express";
import {
  getCheckoutData,
  saveCustomerInfo,
  sendCheckoutOTP,
  verifyCheckoutOTP,
  saveCheckoutDetails,
  placeOrder,
  getOrderConfirmation,
  getCheckoutSession,
  getUserOrders,
  validateEmailOnly,
  validateOTP,
} from "../controllers/checkoutController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// Get checkout data (cart + user info) - Still useful for logged in users
router.get("/", authenticateUser, getCheckoutData);

// Step 1: Send OTP to email
router.post("/send-otp", validateEmailOnly, sendCheckoutOTP);

// Step 2: Verify OTP
router.post("/verify-otp", validateOTP, verifyCheckoutOTP);

// Step 3: Save details (Personal + Shipping)
router.post("/save-details", saveCheckoutDetails);

// Step 4: Place order
router.post("/place-order", placeOrder);


// Get checkout session data
router.get("/session/:id", getCheckoutSession);

// Get user's orders (Requires login)
router.get("/orders", authenticateUser, getUserOrders);

// Get order confirmation (Public or by session)
router.get("/confirmation/:orderNumber", getOrderConfirmation);


export default router;
