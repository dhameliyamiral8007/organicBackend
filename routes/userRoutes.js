import express from "express";
import userController from "../controllers/userController.js";
import { authenticateUser, authenticateAdmin } from "../middleware/auth.js";
import {
  validateUserRegister,
  validateUserLogin,
  validateUserUpdate,
} from "../middleware/validation.js";

const router = express.Router();

// Public routes
router.post("/register", validateUserRegister, userController.register);
router.post("/login", validateUserLogin, userController.login);

// Protected user routes
router.get("/profile", authenticateUser, userController.getProfile);
router.put("/profile", authenticateUser, validateUserUpdate, userController.updateProfile);

// Admin routes (to get all users)
router.get("/", authenticateAdmin, userController.getAllUsers);

export default router;
