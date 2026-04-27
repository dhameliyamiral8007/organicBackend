import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import CheckoutSession from "../models/CheckoutSession.js";
import Coupon from "../models/Coupon.js";
import { body, validationResult } from "express-validator";
import { sequelize } from "../config/sequelize.js";
import mailService from "../services/mailService.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";



export const validateCustomerInfo = [
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("First name must be between 2 and 100 characters"),

  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Last name must be between 2 and 100 characters"),

  body("email")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

export const validatePhoneOnly = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

export const validateCustomerDetails = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("First name must be between 2 and 100 characters"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Last name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),
];

export const validateShippingAddress = [
  body("address")
    .notEmpty()
    .withMessage("Address is required"),
  body("city")
    .notEmpty()
    .withMessage("City is required"),
  body("zipCode")
    .notEmpty()
    .withMessage("ZIP code is required"),
];

export const validateEmailOnly = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),
];

export const validateOTP = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
];


export const getCheckoutData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's cart with product details
    const cart = await Cart.findAll({
      where: { userId },
      include: [
        {
          model: Product,
          as: "product",
          attributes: [
            "id",
            "name",
            "description",
            "price",
            "featured_image",
            "category",
            "stock",
            "is_available"
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    if (cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    // Check if all products are still available
    const unavailableProducts = cart.filter(item =>
      !item.product.is_available || item.product.stock < item.quantity
    );

    if (unavailableProducts.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some items in your cart are no longer available",
        data: unavailableProducts.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          issue: !item.product.is_available ? "Product not available" : `Insufficient stock (only ${item.product.stock} available)`,
        })),
      });
    }

    // Calculate totals
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const shippingCost = 0; // Free shipping
    const tax = 0; // No tax for now
    const totalAmount = subtotal + shippingCost + tax;

    // Get user information for pre-filling
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "phone", "address"],
    });

    res.json({
      success: true,
      data: {
        cart: {
          items: cart,
          totalItems,
          subtotal,
          shippingCost,
          tax,
          totalAmount,
        },
        user: user ? {
          firstName: user.name ? user.name.split(' ')[0] : '',
          lastName: user.name ? user.name.split(' ').slice(1).join(' ') : '',
          email: user.email,
          phone: user.phone,
        } : {},
      },
    });
  } catch (error) {
    console.error("Get checkout data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch checkout data",
      error: error.message,
    });
  }
};

export const saveCustomerInfo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { firstName, lastName, email, phone } = req.body;
    const userId = req.user.id;

    // You could save this to session or temporary storage
    // For now, we'll just return success
    res.json({
      success: true,
      message: "Customer information saved successfully",
      data: {
        firstName,
        lastName,
        email,
        phone,
      },
    });
  } catch (error) {
    console.error("Save customer info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save customer information",
      error: error.message,
    });
  }
};

// Step 1: Send OTP to Email
export const sendCheckoutOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Find or create session for this email
    let session = await CheckoutSession.findOne({
      where: { email, isCompleted: false }
    });

    if (session) {
      await session.update({ otp, otpExpiresAt, currentStep: "otp" });
    } else {
      session = await CheckoutSession.create({
        email,
        otp,
        otpExpiresAt,
        currentStep: "otp",
        userId: req.user ? req.user.id : null
      });
    }

    // Send Email
    await mailService.sendOTPEmail(email, otp);

    res.json({
      success: true,
      message: "OTP sent successfully",
      data: { email, sessionId: session.id }
    });
  } catch (error) {
    console.error("Send checkout OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
  }
};

// Step 2: Verify OTP
export const verifyCheckoutOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, otp } = req.body;

    const session = await CheckoutSession.findOne({
      where: { email, otp, isCompleted: false }
    });

    if (!session) {
      return res.status(400).json({ success: false, message: "Invalid OTP or session expired" });
    }

    if (new Date() > session.otpExpiresAt) {
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    // 🔥 FIND OR CREATE USER
    let user = await User.findOne({ where: { email } });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const randomPassword = crypto.randomBytes(10).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        email,
        name: email.split('@')[0], // Default name
        password: hashedPassword,
        role: "user"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    await session.update({
      isEmailVerified: true,
      otp: null,
      otpExpiresAt: null,
      userId: user.id, // Link session to user
      currentStep: "details"
    });

    res.json({
      success: true,
      message: isNewUser ? "User created and email verified" : "Email verified successfully",
      data: { 
        sessionId: session.id,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error("Verify checkout OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to verify OTP", error: error.message });
  }
};


// Step 3: Save Customer Details & Address
export const saveCheckoutDetails = async (req, res) => {
  try {
    const { sessionId, firstName, lastName, phone, dob, address, city, zipCode } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID is required" });
    }

    const session = await CheckoutSession.findByPk(sessionId);
    if (!session || session.isCompleted) {
      return res.status(404).json({ success: false, message: "Active session not found" });
    }

    if (!session.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email not verified" });
    }

    await session.update({
      firstName,
      lastName,
      phone,
      dob,
      shippingAddress: { address, city, zipCode },
      currentStep: "payment"
    });

    res.json({
      success: true,
      message: "Details saved successfully",
      data: { sessionId: session.id, nextStep: "payment" }
    });
  } catch (error) {
    console.error("Save checkout details error:", error);
    res.status(500).json({ success: false, message: "Failed to save details", error: error.message });
  }
};


export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const whereClause = { userId };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "featured_image", "category"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Parse JSON addresses for response
    const formattedOrders = orders.map(order => {
      let shippingAddress = order.shippingAddress;
      let billingAddress = order.billingAddress;

      // Try to parse addresses if they're strings
      try {
        if (typeof shippingAddress === 'string') {
          shippingAddress = JSON.parse(shippingAddress);
        }
      } catch (e) {
        console.log("Failed to parse shippingAddress:", shippingAddress);
        shippingAddress = { address: "Invalid address format" };
      }

      try {
        if (typeof billingAddress === 'string') {
          billingAddress = JSON.parse(billingAddress);
        }
      } catch (e) {
        console.log("Failed to parse billingAddress:", billingAddress);
        billingAddress = { address: "Invalid address format" };
      }

      return {
        ...order.toJSON(),
        shippingAddress,
        billingAddress,
      };
    });

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalOrders: count,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user orders",
      error: error.message,
    });
  }
};

// Get checkout session data
export const getCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const checkoutSession = await CheckoutSession.findOne({
      where: { userId, isCompleted: false }
    });

    if (!checkoutSession) {
      return res.status(404).json({
        success: false,
        message: "No active checkout session found",
      });
    }

    res.json({
      success: true,
      data: checkoutSession,
    });
  } catch (error) {
    console.error("Get checkout session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get checkout session",
      error: error.message,
    });
  }
};

export const placeOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      paymentMethod = "cod",
      orderNotes,
      couponCode,
      sessionId // Add sessionId here
    } = req.body;

    let userId = req.user ? req.user.id : null;


    // Get checkout session
    let checkoutSession;
    if (sessionId) {
      checkoutSession = await CheckoutSession.findByPk(sessionId, { transaction });
    } else if (userId) {
      checkoutSession = await CheckoutSession.findOne({
        where: { userId, isCompleted: false },
        transaction,
      });
    }

    if (!checkoutSession) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Please complete checkout steps first",
      });
    }

    if (!userId && checkoutSession.userId) {
      userId = checkoutSession.userId;
    }



    // Validate required fields
    if (!checkoutSession.phone || !checkoutSession.firstName || !checkoutSession.email || !checkoutSession.shippingAddress) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Please complete all checkout steps",
      });
    }

    // Get items (could be from user's cart or session - for guest we might need another way, 
    // but usually guest checkout also uses a cart attached to session or localStorage)
    // If guest, we assume the cart is still tracked by userId if they were semi-logged in or by some other means.
    // However, if no userId, we need another way to get the cart.
    // For now, let's assume cart is linked to userId or passed in request if guest.
    
    // Actually, if it's guest, the cart might be in the request body.
    const { guestItems } = req.body;
    let cart;

    if (userId) {
      cart = await Cart.findAll({
        where: { userId },
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "featured_image", "category", "stock", "is_available", "variants"],
          },
        ],
        transaction,
      });
    }

    if ((!cart || cart.length === 0) && guestItems) {
      // For guest checkout or empty user cart, we use items passed from frontend
      cart = await Promise.all(guestItems.map(async (item) => {
        const product = await Product.findByPk(item.productId, { transaction });
        if (!product) return null;

        let price = parseFloat(product.price);
        let variantLabel = item.variantLabel;
        let variantImage = null;

        // If variant index is provided, use variant price
        if (typeof item.variantIndex === "number" && product.variants && product.variants[item.variantIndex]) {
          const variant = product.variants[item.variantIndex];
          price = parseFloat(variant.price || product.price);
          variantLabel = variant.label;
          variantImage = variant.image;
        }

        return {
          productId: item.productId,
          product,
          quantity: item.quantity,
          price: price.toString(),
          totalPrice: (price * item.quantity).toString(),
          variantIndex: item.variantIndex,
          variantLabel: variantLabel,
          variantImage: variantImage
        };
      }));
      cart = cart.filter(Boolean);
    }




    if (cart.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    // Check product/variant availability
    for (const cartItem of cart) {
      if (!cartItem.product.is_available) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Product "${cartItem.product.name}" is no longer available`,
        });
      }

      let availableStock = cartItem.product.stock;
      let variantIndexResolved = null;
      if (typeof cartItem.variantIndex === "number") {
        variantIndexResolved = cartItem.variantIndex;
      } else if (typeof cartItem.variantIndex === "string") {
        const parsed = parseInt(cartItem.variantIndex);
        if (!Number.isNaN(parsed)) variantIndexResolved = parsed;
      } else if (cartItem.variantLabel) {
        const variantsTmp = Array.isArray(cartItem.product.variants) ? cartItem.product.variants : [];
        const foundIdx = variantsTmp.findIndex(v => v?.label == cartItem.variantLabel);
        if (foundIdx >= 0) variantIndexResolved = foundIdx;
      }
      if (variantIndexResolved !== null) {
        const variants = Array.isArray(cartItem.product.variants) ? cartItem.product.variants : [];
        const variant = variants[variantIndexResolved];
        if (!variant) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Selected variant not found for "${cartItem.product.name}"`,
          });
        }
        availableStock = parseInt(variant.stock ?? 0);
      }

      if (availableStock < cartItem.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${cartItem.product.name}". Only ${availableStock} available`,
        });
      }
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const shippingCost = 0;
    const tax = 0;

    // Apply coupon if provided
    let appliedCouponCode = null;
    let couponDiscount = 0;
    if (couponCode) {
      const normalized = String(couponCode).toUpperCase().trim();
      const coupon = await Coupon.findOne({ where: { code: normalized, is_active: true }, transaction });
      if (!coupon) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Invalid or inactive coupon" });
      }
      const now = new Date();
      if (coupon.start_date && now < new Date(coupon.start_date)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Coupon not started yet" });
      }
      if (coupon.end_date && now > new Date(coupon.end_date)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Coupon expired" });
      }
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
      }
      if (Array.isArray(coupon.user_ids) && coupon.user_ids.length && !coupon.user_ids.includes(userId)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Coupon not allowed for this user" });
      }
      if (coupon.per_user_limit) {
        const usedCount = await Order.count({ where: { userId, couponCode: normalized }, transaction });
        if (usedCount >= coupon.per_user_limit) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: "Coupon per-user limit reached" });
        }
      }
      if (parseFloat(coupon.min_subtotal || 0) > subtotal) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: `Minimum order amount ${coupon.min_subtotal} not met` });
      }
      // Eligible subtotal based on scope
      let eligibleSubtotal = subtotal;
      if (coupon.scope === "product" && Array.isArray(coupon.product_ids) && coupon.product_ids.length) {
        eligibleSubtotal = cart
          .filter(ci => coupon.product_ids.includes(ci.productId))
          .reduce((s, ci) => s + parseFloat(ci.totalPrice), 0);
      } else if (coupon.scope === "category" && Array.isArray(coupon.category_list) && coupon.category_list.length) {
        eligibleSubtotal = cart
          .filter(ci => coupon.category_list.includes(ci.product.category))
          .reduce((s, ci) => s + parseFloat(ci.totalPrice), 0);
      } else if (coupon.scope === "user") {
        eligibleSubtotal = subtotal; // user scope already verified
      }
      if (eligibleSubtotal <= 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Coupon not applicable to selected items" });
      }
      if (coupon.discount_type === "percentage") {
        couponDiscount = (eligibleSubtotal * parseFloat(coupon.discount_value)) / 100;
        if (coupon.max_discount) {
          couponDiscount = Math.min(couponDiscount, parseFloat(coupon.max_discount));
        }
      } else {
        couponDiscount = Math.min(parseFloat(coupon.discount_value), eligibleSubtotal);
      }
      appliedCouponCode = normalized;
    }
    const totalAmount = Math.max(0, subtotal - couponDiscount + shippingCost + tax);

    // Generate order number
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Helper to safely serialize address
    const serializeAddress = (addr) => {
      if (!addr) return null;
      if (typeof addr === 'object') return JSON.stringify(addr);
      // Already a string - check if valid JSON
      try {
        JSON.parse(addr);
        return addr; // Valid JSON string, use as-is
      } catch {
        return JSON.stringify({ address: addr }); // Plain string, wrap it
      }
    };

    // Create order
    const order = await Order.create({
      orderNumber,
      userId,
      status: "pending",
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      couponCode: appliedCouponCode,
      couponDiscount,
      firstName: checkoutSession.firstName,
      lastName: checkoutSession.lastName,
      email: checkoutSession.email,
      phone: checkoutSession.phone,
      shippingAddress: checkoutSession.shippingAddress,
      billingAddress: checkoutSession.billingAddress || checkoutSession.shippingAddress,
      paymentMethod,
      paymentStatus: "pending",
      orderNotes,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }, { transaction });

    // Create order items and update product stock
    for (const cartItem of cart) {
      const getImgStr = (img) => {
        if (!img) return null;
        if (typeof img === 'string') return img;
        if (typeof img === 'object') return img.url || img.secure_url || JSON.stringify(img);
        return String(img);
      };

      await OrderItem.create({
        orderId: order.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        price: cartItem.price,
        totalPrice: cartItem.totalPrice,
        productName: cartItem.product.name,
        productImage: getImgStr(cartItem.variantImage || cartItem.product.featured_image),
        productCategory: cartItem.product.category,
        variantLabel: cartItem.variantLabel || null,
        variantImage: getImgStr(cartItem.variantImage) || null,
      }, { transaction });


      // Update product/variant stock
      let variantIndexResolved = null;
      if (typeof cartItem.variantIndex === "number") {
        variantIndexResolved = cartItem.variantIndex;
      } else if (typeof cartItem.variantIndex === "string") {
        const parsed = parseInt(cartItem.variantIndex);
        if (!Number.isNaN(parsed)) variantIndexResolved = parsed;
      } else if (cartItem.variantLabel) {
        const variantsTmp = Array.isArray(cartItem.product.variants) ? cartItem.product.variants : [];
        const foundIdx = variantsTmp.findIndex(v => v?.label == cartItem.variantLabel);
        if (foundIdx >= 0) variantIndexResolved = foundIdx;
      }
      if (variantIndexResolved !== null) {
        const productRow = await Product.findByPk(cartItem.productId, { transaction });
        const variants = Array.isArray(productRow.variants) ? productRow.variants : [];
        const idx = variantIndexResolved;
        if (variants[idx]) {
          const currentStock = parseInt(variants[idx].stock ?? 0);
          const newStock = Math.max(0, currentStock - cartItem.quantity);
          const newVariants = variants.map((v, i) => {
            if (i === idx) {
              return {
                ...v,
                stock: newStock,
              };
            }
            return { ...v };
          });
          const totalStock = newVariants.reduce((sum, v) => sum + parseInt(v?.stock ?? 0), 0);
          await productRow.update({ variants: newVariants, stock: totalStock, views: sequelize.literal('views + 1') }, { transaction });
        }
      } else {
        await Product.update(
          {
            stock: sequelize.literal(`stock - ${cartItem.quantity}`),
            views: sequelize.literal('views + 1')
          },
          {
            where: { id: cartItem.productId },
            transaction
          }
        );
      }
    }

    // Increment coupon usage count if applied
    if (appliedCouponCode) {
      await Coupon.update(
        { usage_count: sequelize.literal("usage_count + 1") },
        { where: { code: appliedCouponCode }, transaction }
      );
    }
    // Clear user's cart (Only for COD or successful online payment)
    if (userId && paymentMethod !== "online") {
      await Cart.destroy({
        where: { userId },
        transaction,
      });
    }

    // Mark checkout session as completed
    if (paymentMethod !== "online") {
      await checkoutSession.update({
        isCompleted: true,
        currentStep: "completed",
      }, { transaction });
    }

    await transaction.commit();

    // Get complete order details
    const completeOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "featured_image"],
            },
          ],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: completeOrder,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Place order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message,
    });
  }
};
export const getOrderConfirmation = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: {
        orderNumber,
        userId,
      },
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "featured_image", "category"],
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order confirmation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order confirmation",
      error: error.message,
    });
  }
};
