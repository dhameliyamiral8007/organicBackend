import express from "express";
import adminController from "../controllers/adminController.js";
import { authenticateAdmin } from "../middleware/auth.js";
import {
  validateAdminRegister,
  validateAdminLogin,
  validateAdminUpdate,
} from "../middleware/validation.js";

const router = express.Router();

// Public routes
router.post("/register", validateAdminRegister, adminController.register);
router.post("/login", validateAdminLogin, adminController.login);
router.post("/forgot-password", adminController.forgotPassword);
router.post("/verify-otp", adminController.verifyOTP);
router.post("/reset-password", adminController.resetPassword);

// Protected admin routes
router.get("/profile", authenticateAdmin, adminController.getProfile);
router.put("/profile", authenticateAdmin, validateAdminUpdate, adminController.updateProfile);
router.put("/:id", authenticateAdmin, validateAdminUpdate, adminController.updateProfile);
router.post("/db/sync", authenticateAdmin, adminController.syncDatabase);

export default router;
