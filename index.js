import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
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
import paymentRoutes from "./routes/paymentRoutes.js";

// Load environment variables removed from here as it's now at the top

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000"
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
});

const PORT = process.env.PORT || 3000;

// Socket.io connection logic
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join_order", (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`User joined order room: order_${orderId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make io accessible to routes
app.set("io", io);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
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
app.use("/api/payments", paymentRoutes);

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
    error: err?.message,
    requestId: req.headers["x-request-id"] || undefined,
  });
});

// Start server
async function startServer() {
  try {
    // Connect and sync models
    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL via Sequelize");

    // Start listening
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    (async () => {
      try {
        console.log("ℹ️ Starting database synchronization...");
        await sequelize.sync({ alter: true });
        console.log("✅ Database models synchronized");
      } catch (err) {
        console.error("❌ Database sync failed:", err?.message || err);
      }
    })();
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
