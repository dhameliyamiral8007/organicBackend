import express from "express";
import {
  submitContactForm,
  getUserContacts,
  getAllContacts,
  getContactById,
  respondToContact,
  updateContactStatus,
  deleteContact,
  getContactStats,
  validateContactForm,
  validateAdminResponse,
} from "../controllers/contactController.js";
import { authenticateUser } from "../middleware/auth.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// User side routes (no authentication required for contact form submission)
router.post("/submit", validateContactForm, submitContactForm);

// User side routes (authentication required)
router.use(authenticateUser);
router.get("/my-contacts", getUserContacts);

// Admin side routes (admin authentication required)
const adminRouter = express.Router();
adminRouter.use(authenticateAdmin);

adminRouter.get("/", getAllContacts);
adminRouter.get("/stats", getContactStats);
adminRouter.get("/:id", getContactById);
adminRouter.post("/:id/respond", validateAdminResponse, respondToContact);
adminRouter.put("/:id/status", updateContactStatus);
adminRouter.delete("/:id", deleteContact);

// Mount admin routes under /admin
router.use("/admin", adminRouter);

export default router;
