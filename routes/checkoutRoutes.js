import express from "express";
import {
  getCheckoutData,
  saveCustomerInfo,
  savePhoneNumber,
  saveCustomerDetails,
  saveShippingAddress,
  placeOrder,
  getOrderConfirmation,
  validateCustomerInfo,
  validatePhoneOnly,
  validateCustomerDetails,
  validateShippingAddress,
} from "../controllers/checkoutController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// All checkout routes require user authentication
router.use(authenticateUser);

// Get checkout data (cart + user info)
router.get("/", getCheckoutData);
// Legacy: Save customer information (all at once)
router.post("/customer-info", validateCustomerInfo, saveCustomerInfo);

// Step 1: Save phone number only
router.post("/step1/phone", validatePhoneOnly, savePhoneNumber);

// Step 2: Save customer details (first name, last name, email)
router.post("/step2/customer-details", validateCustomerDetails, saveCustomerDetails);

// Step 3: Save shipping address
router.post("/step3/shipping-address", validateShippingAddress, saveShippingAddress);


// Save shipping address (legacy)
// router.post("/shipping-address", validateShippingAddress, saveShippingAddress);

// Place order (Final step)
router.post("/place-order", placeOrder);

// Get order confirmation
router.get("/confirmation/:orderNumber", getOrderConfirmation);

export default router;
