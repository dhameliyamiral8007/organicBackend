import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import CheckoutSession from "../models/CheckoutSession.js";

// Function to get Razorpay instance lazily to ensure environment variables are loaded
const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error("❌ Razorpay credentials are missing in .env file");
        throw new Error("Razorpay credentials are missing");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

export const createOrder = async (req, res) => {
    try {
        const { amount, currency = "INR", receipt } = req.body;
        console.log("Creating Razorpay order with amount:", amount);

        if (!amount) {
            return res.status(400).json({
                success: false,
                message: "Amount is required",
            });
        }

        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
            currency,
            receipt,
        };

        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create(options);
        console.log("Order created successfully:", order.id);

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId, // Internal database order ID
        } = req.body;

        console.log("Verifying payment for:", {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId
        });

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        console.log("Signature comparison:", {
            expected: expectedSignature,
            received: razorpay_signature
        });

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            console.log("✅ Payment verified successfully");

            const userId = req.user.id;

            // Update the Database Order
            const dbOrder = await Order.findByPk(orderId);
            if (dbOrder) {
                await dbOrder.update({
                    status: "confirmed",
                    paymentStatus: "paid"
                });
                console.log(`Order ${orderId} status updated to confirmed/paid`);
            }

            // Clear the User's Cart
            await Cart.destroy({
                where: { userId }
            });
            console.log(`Cart cleared for user ${userId}`);

            // Mark Checkout Session as completed
            await CheckoutSession.update(
                { isCompleted: true, currentStep: "completed" },
                { where: { userId, isCompleted: false } }
            );
            console.log(`Checkout session completed for user ${userId}`);

            const io = req.app.get("io");
            if (io) {
                io.to(`order_${orderId}`).emit("payment_success", {
                    orderId,
                    razorpay_payment_id,
                });
            }

            res.status(200).json({
                success: true,
                message: "Payment verified successfully",
            });
        } else {
            console.error("❌ Payment verification failed: Signatures do not match");
            res.status(400).json({
                success: false,
                message: "Payment verification failed",
            });
        }
    } catch (error) {
        console.error("Error verifying Razorpay payment:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
