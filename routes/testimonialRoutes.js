import express from "express";
import {
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getPublicTestimonials,
  getAllTestimonials,
  getTestimonialById,
  validateTestimonial,
} from "../controllers/testimonialController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/testimonials", getPublicTestimonials);

// Admin routes
router.post(
  "/admin/testimonials",
  authenticateAdmin,
  validateTestimonial,
  createTestimonial
);

router.put(
  "/admin/testimonials/:id",
  authenticateAdmin,
  validateTestimonial,
  updateTestimonial
);

router.delete(
  "/admin/testimonials/:id",
  authenticateAdmin,
  deleteTestimonial
);

router.get(
  "/admin/testimonials/:id",
  authenticateAdmin,
  getTestimonialById
);

router.get(
  "/admin/testimonials",
  authenticateAdmin,
  getAllTestimonials
);

export default router;
