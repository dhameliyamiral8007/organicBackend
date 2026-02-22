import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import CheckoutSession from "../models/CheckoutSession.js";
import Coupon from "../models/Coupon.js";
import { body, validationResult } from "express-validator";
import { sequelize } from "../config/sequelize.js";

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
    .withMessage("Address is required")
    .isObject()
    .withMessage("Address must be an object"),

  body("address.flatHouseNo")
    .notEmpty()
    .withMessage("Flat/House No is required"),

  body("address.area")
    .notEmpty()
    .withMessage("Area is required"),

  body("address.pincode")
    .notEmpty()
    .withMessage("Pincode is required"),

  body("address.city")
    .notEmpty()
    .withMessage("City is required"),

  body("address.state")
    .notEmpty()
    .withMessage("State is required"),

  body("addressType")
    .optional()
    .isIn(["home", "office", "other"])
    .withMessage("Invalid address type"),
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

// Step 1: Save phone number only
export const savePhoneNumber = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { phone } = req.body;
    const userId = req.user.id;

    // Find or create checkout session
    let checkoutSession = await CheckoutSession.findOne({
      where: { userId, isCompleted: false }
    });

    if (checkoutSession) {
      // Update existing session
      await checkoutSession.update({
        phone,
        currentStep: "customer-details",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset expiry
      });
    } else {
      // Create new session
      checkoutSession = await CheckoutSession.create({
        userId,
        phone,
        currentStep: "customer-details",
      });
    }

    res.json({
      success: true,
      message: "Phone number saved successfully",
      data: {
        phone,
        nextStep: "customer-details",
        sessionId: checkoutSession.id
      },
    });
  } catch (error) {
    console.error("Save phone number error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save phone number",
      error: error.message,
    });
  }
};

// Step 2: Save customer details (first name, last name, email)
export const saveCustomerDetails = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { firstName, lastName, email } = req.body;
    const userId = req.user.id;

    // Find existing checkout session
    let checkoutSession = await CheckoutSession.findOne({
      where: { userId, isCompleted: false }
    });

    if (!checkoutSession) {
      return res.status(400).json({
        success: false,
        message: "Please start with phone number first",
      });
    }

    // Update session with customer details
    await checkoutSession.update({
      firstName,
      lastName,
      email,
      currentStep: "shipping-address",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset expiry
    });

    res.json({
      success: true,
      message: "Customer details saved successfully",
      data: {
        firstName,
        lastName,
        email,
        nextStep: "shipping-address",
        sessionId: checkoutSession.id
      },
    });
  } catch (error) {
    console.error("Save customer details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save customer details",
      error: error.message,
    });
  }
};

// export const saveShippingAddress = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation errors",
//         errors: errors.array(),
//       });
//     }

//     const { address, addressType, billingAddress } = req.body;
//     const userId = req.user.id;

//     let checkoutSession = await CheckoutSession.findOne({
//       where: { userId, isCompleted: false }
//     });

//     if (!checkoutSession) {
//       return res.status(400).json({
//         success: false,
//         message: "Please complete previous steps first",
//       });
//     }

//     // DataTypes.JSON છે એટલે object directly આપો — stringify નહીં
//     const shippingAddressToSave = {
//       ...(typeof address === 'string' ? { address } : address),
//       type: addressType || "home",
//     };

//     const billingAddressToSave = billingAddress 
//       ? (typeof billingAddress === 'string' ? { address: billingAddress } : billingAddress)
//       : null;

//     await checkoutSession.update({
//       shippingAddress: shippingAddressToSave,  // ✅ plain object — Sequelize handle કરશે
//       billingAddress: billingAddressToSave,
//       currentStep: "payment",
//       expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
//     });

//     res.json({
//       success: true,
//       message: "Shipping address saved successfully",
//       data: {
//         address: shippingAddressToSave,
//         billingAddress: billingAddressToSave,
//         nextStep: "payment",
//         sessionId: checkoutSession.id,
//       },
//     });
//   } catch (error) {
//     console.error("Save shipping address error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to save shipping address",
//       error: error.message,
//     });
//   }
// };


// Get user's orders

export const saveShippingAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { address, addressType } = req.body;
    const userId = req.user.id;

    let parsedAddress = address;

    if (typeof parsedAddress === "string") {
      try {
        parsedAddress = JSON.parse(parsedAddress);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid address format",
        });
      }
    }

    // 🔎 Find active checkout session
    let session = await CheckoutSession.findOne({
      where: {
        userId,
        isCompleted: false,
      },
    });

    // 🆕 If no session exists, create one
    if (!session) {
      session = await CheckoutSession.create({
        userId,
        shippingAddress: parsedAddress,
        currentStep: "payment",
      });
    } else {
      // ✏️ Update existing session
      await session.update({
        shippingAddress: parsedAddress,
        currentStep: "payment",
      });
    }

    res.json({
      success: true,
      message: "Shipping address saved successfully",
      data: session,
    });

  } catch (error) {
    console.error("Save shipping address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save shipping address",
      error: error.message,
    });
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
      couponCode
    } = req.body;
    
    const userId = req.user.id;

    // Get checkout session
    const checkoutSession = await CheckoutSession.findOne({
      where: { userId, isCompleted: false },
      transaction,
    });

    if (!checkoutSession) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Please complete checkout steps first",
      });
    }

    // Validate required fields
    if (!checkoutSession.phone || !checkoutSession.firstName || !checkoutSession.email || !checkoutSession.shippingAddress) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Please complete all checkout steps",
      });
    }

    // Get user's cart
    const cart = await Cart.findAll({
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
      await OrderItem.create({
        orderId: order.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        price: cartItem.price,
        totalPrice: cartItem.totalPrice,
        productName: cartItem.product.name,
        productImage: cartItem.product.featured_image,
        productCategory: cartItem.product.category,
        variantLabel: cartItem.variantLabel || null,
        variantImage: cartItem.variantImage || null,
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
    // Clear user's cart
    await Cart.destroy({
      where: { userId },
      transaction,
    });

    // Mark checkout session as completed
    await checkoutSession.update({
      isCompleted: true,
      currentStep: "completed",
    }, { transaction });

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
