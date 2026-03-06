import userService from "../services/userService.js";
import { sequelize } from "../config/sequelize.js";
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

  // Forgot password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const result = await userService.forgotPassword(email, "admin");
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      const result = await userService.verifyOTP(email, otp, "admin");
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Email, OTP and new password are required",
        });
      }

      const result = await userService.resetPassword(email, otp, newPassword, "admin");
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async syncDatabase(req, res) {
    try {
      const result = await sequelize.sync({ alter: true });
      res.status(200).json({
        success: true,
        message: "Database synchronized successfully",
        data: {
          dialect: result.getDialect ? result.getDialect() : "postgres",
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to synchronize database",
        error: error.message,
      });
    }
  }
}

export default new AdminController();
