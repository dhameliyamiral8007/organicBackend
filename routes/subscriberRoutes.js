import express from "express";
import subscriberController from "../controllers/subscriberController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public route to subscribe
router.post("/", subscriberController.subscribe);

// Admin route to get all subscribers
router.get("/", authenticateAdmin, subscriberController.getAllSubscribers);

export default router;
