import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
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
  body("address.flatHouseNo")
    .trim()
    .notEmpty()
    .withMessage("Flat/House No. is required"),
  
  body("address.area")
    .trim()
    .notEmpty()
    .withMessage("Area/Sector/Village is required"),
  
  body("address.pincode")
    .trim()
    .notEmpty()
    .withMessage("Pincode is required")
    .isPostalCode("IN")
    .withMessage("Please provide a valid Indian pincode"),
  
  body("address.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),
  
  body("address.state")
    .trim()
    .notEmpty()
    .withMessage("State is required"),
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

    res.json({
      success: true,
      message: "Phone number saved successfully",
      data: {
        phone,
        nextStep: "customer-details"
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

    res.json({
      success: true,
      message: "Customer details saved successfully",
      data: {
        firstName,
        lastName,
        email,
        nextStep: "shipping-address"
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

    // You could save this to session or temporary storage
    res.json({
      success: true,
      message: "Shipping address saved successfully",
      data: {
        address: {
          ...address,
          type: addressType || "home",
        },
      },
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

export const placeOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone,
      shippingAddress,
      billingAddress,
      paymentMethod = "cod",
      orderNotes 
    } = req.body;
    
    const userId = req.user.id;

    // Get user's cart
    const cart = await Cart.findAll({
      where: { userId },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "featured_image", "category", "stock", "is_available"],
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

    // Check product availability again
    for (const cartItem of cart) {
      if (!cartItem.product.is_available) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Product "${cartItem.product.name}" is no longer available`,
        });
      }
      
      if (cartItem.product.stock < cartItem.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${cartItem.product.name}". Only ${cartItem.product.stock} available`,
        });
      }
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const shippingCost = 0; // Free shipping
    const tax = 0; // No tax for now
    const totalAmount = subtotal + shippingCost + tax;

    // Generate order number
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create order
    const order = await Order.create({
      orderNumber,
      userId,
      status: "pending",
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      firstName,
      lastName,
      email,
      phone,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      orderNotes,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
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
      }, { transaction });

      // Update product stock
      await Product.update(
        { 
          stock: sequelize.literal(`stock - ${cartItem.quantity}`),
          views: sequelize.literal('views + 1') // Increment views
        },
        { 
          where: { id: cartItem.productId },
          transaction 
        }
      );
    }

    // Clear user's cart
    await Cart.destroy({
      where: { userId },
      transaction,
    });

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
