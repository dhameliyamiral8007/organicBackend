import userService from "../services/userService.js";
import { validationResult } from "express-validator";

class AdminController {
  // Register admin
  async register(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const result = await userService.registerAdmin(req.body);
      res.status(201).json({
        success: true,
        message: "Admin registered successfully",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Login admin
  async login(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;
      const result = await userService.loginAdmin(email, password);
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get admin profile
  async getProfile(req, res) {
    try {
      const admin = await userService.getAdminProfile(req.admin.id);
      res.status(200).json({
        success: true,
        data: admin,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update admin profile
  async updateProfile(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const admin = await userService.updateAdminProfile(req.admin.id, req.body);
      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: admin,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new AdminController();
