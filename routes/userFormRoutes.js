import express from "express";
import {
  submitUserForm,
  getAllUserForms,
  getUserFormById,
  respondToUserForm,
  updateUserFormStatus,
  deleteUserForm,
  getUserFormStats,
  getUserOwnForms,
  validateUserForm,
} from "../controllers/userFormController.js";
import { authenticateUser, authenticateAdmin } from "../middleware/auth.js";
import { body } from "express-validator";

const router = express.Router();

// Public/User routes (no authentication required for basic submission)
router.post("/submit", validateUserForm, submitUserForm);

// User routes (authentication required)
router.get("/my-forms", authenticateUser, getUserOwnForms);

// Admin routes (admin authentication required)
const adminRouter = express.Router();
adminRouter.use(authenticateAdmin);

// Admin: Get all user forms with filtering and pagination
adminRouter.get("/", getAllUserForms);

// Admin: Get user form by ID
adminRouter.get("/:id", getUserFormById);

// Admin: Respond to user form
adminRouter.post("/:id/respond", [
  body("adminResponse")
    .trim()
    .notEmpty()
    .withMessage("Response is required")
    .isLength({ min: 5, max: 2000 })
    .withMessage("Response must be between 5 and 2000 characters"),
  
  body("status")
    .optional()
    .isIn(["pending", "in_progress", "resolved", "closed"])
    .withMessage("Invalid status"),
], respondToUserForm);

// Admin: Update user form status
adminRouter.put("/:id/status", [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "in_progress", "resolved", "closed"])
    .withMessage("Invalid status"),
], updateUserFormStatus);

// Admin: Delete user form
adminRouter.delete("/:id", deleteUserForm);

// Admin: Get user form statistics
adminRouter.get("/stats/overview", getUserFormStats);

// Mount admin routes
router.use("/admin", adminRouter);

export default router;
