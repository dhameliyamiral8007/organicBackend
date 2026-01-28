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

// Protected admin routes
router.get("/profile", authenticateAdmin, adminController.getProfile);
router.put("/profile", authenticateAdmin, validateAdminUpdate, adminController.updateProfile);

export default router;
