import express from "express";
import {
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getAllFAQs,
  getFAQCategories,
  getFAQById,
  validateFAQ,
} from "../controllers/faqController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// Admin routes
router.post(
  "/admin/faqs",
  authenticateAdmin,
  validateFAQ,
  createFAQ
);

router.put(
  "/admin/faqs/:id",
  authenticateAdmin,
  validateFAQ,
  updateFAQ
);

router.delete(
  "/admin/faqs/:id",
  authenticateAdmin,
  deleteFAQ
);

router.get(
  "/admin/faqs/:id",
  authenticateAdmin,
  getFAQById
);

router.get(
  "/admin/faqs",
  authenticateAdmin,
  getAllFAQs
);

// User side (Public) and Admin view
router.get("/faqs", getAllFAQs);
router.get("/faqs/categories", getFAQCategories);

export default router;
