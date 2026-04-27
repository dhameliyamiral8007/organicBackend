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

// All routes here require admin authentication
router.use(authenticateAdmin);

// Customer routes
router.get("/customers", getAllCustomers);
router.get("/customers/:id", getCustomerById);

// Order routes
router.get("/orders", getAllOrders);
router.get("/orders/:id", getOrderById);
router.get("/orders/number/:orderNumber", getOrderByNumber);
router.put("/orders/:id/status", updateOrderStatus);

// Stats routes
router.get("/stats/dashboard", getDashboardStats);

export default router;
