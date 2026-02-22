import express from "express";
import {
  createCoupon,
  updateCoupon,
  getAllCoupons,
  getCouponById,
  deleteCoupon,
  validateCoupon,
  validateCouponForUser,
  getEligibleCouponsForUser,
} from "../controllers/couponController.js";
import { authenticateAdmin, authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// Admin CRUD
router.post("/admin/coupons", authenticateAdmin, validateCoupon, createCoupon);
router.put("/admin/coupons/:id", authenticateAdmin, validateCoupon, updateCoupon);
router.get("/admin/coupons", authenticateAdmin, getAllCoupons);
router.get("/admin/coupons/:id", authenticateAdmin, getCouponById);
router.delete("/admin/coupons/:id", authenticateAdmin, deleteCoupon);

// User validation endpoint
router.get("/coupons/validate", authenticateUser, validateCouponForUser);
router.get("/coupons/eligible", authenticateUser, getEligibleCouponsForUser);

export default router;
