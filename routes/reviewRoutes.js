import express from "express";
import reviewController from "../controllers/reviewController.js";
import { authenticate, authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/product/:productId", reviewController.getProductReviews);

// Protected routes (User/Admin)
router.post("/", authenticate, reviewController.createReview);
router.delete("/:id", authenticate, reviewController.deleteReview);

// Admin routes
router.get("/admin", authenticateAdmin, reviewController.getAdminReviews);
router.put("/admin/:id/status", authenticateAdmin, reviewController.updateReviewStatus);

export default router;
