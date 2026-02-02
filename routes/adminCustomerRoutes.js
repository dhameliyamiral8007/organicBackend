import express from "express";
import {
  getAllCustomers,
  getCustomerById,
  getAllOrders,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
  getDashboardStats,
} from "../controllers/adminCustomerController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// All admin customer routes require admin authentication
router.use(authenticateAdmin);

// Dashboard stats
router.get("/dashboard", getDashboardStats);

// Customer management
router.get("/customers", getAllCustomers);
router.get("/customers/:id", getCustomerById);

// Order management
router.get("/orders", getAllOrders);
router.get("/orders/:id", getOrderById);
router.get("/orders/by-number/:orderNumber", getOrderByNumber);
router.put("/orders/:id/status", updateOrderStatus);

export default router;
