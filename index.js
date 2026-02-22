import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize } from "./config/sequelize.js";
import "./models/User.js";
import "./models/Product.js";
import "./models/Cart.js";
import "./models/Order.js";
import "./models/OrderItem.js";
import "./models/Contact.js";
import "./models/Media.js";
import "./models/UserForm.js";
import "./models/CheckoutSession.js";
import "./models/Coupon.js";

// Import routes
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import adminCustomerRoutes from "./routes/adminCustomerRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import userFormRoutes from "./routes/userFormRoutes.js";
import ensureUploadsDir from "./middleware/upload.js";
import couponRoutes from "./routes/couponRoutes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ensureUploadsDir);

// Routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to E-commerce Backend API",
    version: "1.0.0",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/admin", adminCustomerRoutes);
app.use("/api", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/user-forms", userFormRoutes);
app.use("/api", couponRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
async function startServer() {
  try {
    // Connect and sync models
    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL via Sequelize");

    await sequelize.sync({ alter: true });
    console.log("✅ Database models synchronized");

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  await sequelize.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down server...");
  await sequelize.close();
  process.exit(0);
});
