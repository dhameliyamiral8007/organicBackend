import express from "express";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.post("/create-order", authenticateUser, createOrder);
router.post("/verify-payment", authenticateUser, verifyPayment);

export default router;
