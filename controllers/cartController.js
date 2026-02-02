import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { body, validationResult } from "express-validator";
import { sequelize } from "../config/sequelize.js";

export const validateAddToCart = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isInt({ min: 1 })
    .withMessage("Product ID must be a positive integer"),
  
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

export const validateUpdateCart = [
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

export const addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { productId, quantity } = req.body;
    const userId = req.user.id;

    // Check if product exists and is available
    const product = await Product.findOne({
      where: {
        id: productId,
        is_available: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or not available",
      });
    }

    // Check if product has sufficient stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.stock} items available`,
      });
    }

    // Check if item already exists in cart
    const existingCartItem = await Cart.findOne({
      where: {
        userId,
        productId,
      },
    });

    let cartItem;

    if (existingCartItem) {
      // Update existing cart item
      const newQuantity = existingCartItem.quantity + quantity;
      
      if (product.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Only ${product.stock} items available`,
        });
      }

      const totalPrice = parseFloat(product.price) * newQuantity;
      
      await existingCartItem.update({
        quantity: newQuantity,
        totalPrice,
      });

      cartItem = existingCartItem;
    } else {
      // Create new cart item
      const totalPrice = parseFloat(product.price) * quantity;
      
      cartItem = await Cart.create({
        userId,
        productId,
        quantity,
        price: product.price,
        totalPrice,
      });
    }

    // Get updated cart with product details
    const updatedCart = await getCartWithDetails(userId);

    res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      data: {
        cartItem,
        cart: updatedCart,
      },
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
      error: error.message,
    });
  }
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cart = await getCartWithDetails(userId);

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
};

export const increaseQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find cart item
    const cartItem = await Cart.findOne({
      where: {
        id,
        userId,
      },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "price", "stock", "is_available"],
        },
      ],
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // Check if product is still available
    if (!cartItem.product.is_available) {
      return res.status(400).json({
        success: false,
        message: "Product is no longer available",
      });
    }

    // Check stock availability
    const newQuantity = cartItem.quantity + 1;
    if (cartItem.product.stock < newQuantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${cartItem.product.stock} items available`,
      });
    }

    // Update cart item
    const totalPrice = parseFloat(cartItem.product.price) * newQuantity;
    
    await cartItem.update({
      quantity: newQuantity,
      totalPrice,
    });

    // Get updated cart
    const updatedCart = await getCartWithDetails(userId);

    res.json({
      success: true,
      message: "Quantity increased successfully",
      data: {
        cartItem,
        cart: updatedCart,
      },
    });
  } catch (error) {
    console.error("Increase quantity error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to increase quantity",
      error: error.message,
    });
  }
};

export const decreaseQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find cart item
    const cartItem = await Cart.findOne({
      where: {
        id,
        userId,
      },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "price", "stock", "is_available"],
        },
      ],
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // Check if quantity will be less than 1
    if (cartItem.quantity <= 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity cannot be less than 1. Use remove to delete the item.",
      });
    }

    // Update cart item
    const newQuantity = cartItem.quantity - 1;
    const totalPrice = parseFloat(cartItem.product.price) * newQuantity;
    
    await cartItem.update({
      quantity: newQuantity,
      totalPrice,
    });

    // Get updated cart
    const updatedCart = await getCartWithDetails(userId);

    res.json({
      success: true,
      message: "Quantity decreased successfully",
      data: {
        cartItem,
        cart: updatedCart,
      },
    });
  } catch (error) {
    console.error("Decrease quantity error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to decrease quantity",
      error: error.message,
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    // Find cart item
    const cartItem = await Cart.findOne({
      where: {
        id,
        userId,
      },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "price", "stock", "is_available"],
        },
      ],
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // Check if product is still available
    if (!cartItem.product.is_available) {
      return res.status(400).json({
        success: false,
        message: "Product is no longer available",
      });
    }

    // Check stock availability
    if (cartItem.product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${cartItem.product.stock} items available`,
      });
    }

    // Update cart item
    const totalPrice = parseFloat(cartItem.product.price) * quantity;
    
    await cartItem.update({
      quantity,
      totalPrice,
    });

    // Get updated cart
    const updatedCart = await getCartWithDetails(userId);

    res.json({
      success: true,
      message: "Cart item updated successfully",
      data: {
        cartItem,
        cart: updatedCart,
      },
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update cart item",
      error: error.message,
    });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find and delete cart item
    const cartItem = await Cart.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    await cartItem.destroy();

    // Get updated cart
    const updatedCart = await getCartWithDetails(userId);

    res.json({
      success: true,
      message: "Item removed from cart successfully",
      data: {
        removedItemId: id,
        cart: updatedCart,
      },
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
      error: error.message,
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await Cart.destroy({
      where: {
        userId,
      },
    });

    res.json({
      success: true,
      message: "Cart cleared successfully",
      data: {
        cart: {
          items: [],
          totalItems: 0,
          subtotal: 0,
        },
      },
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message,
    });
  }
};

export const getCartSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cartSummary = await Cart.findOne({
      where: {
        userId,
      },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("Cart.id")), "totalItems"],
        [sequelize.fn("SUM", sequelize.col("total_price")), "subtotal"],
      ],
    });

    const totalItems = parseInt(cartSummary?.dataValues?.totalItems) || 0;
    const subtotal = parseFloat(cartSummary?.dataValues?.subtotal) || 0;

    res.json({
      success: true,
      data: {
        totalItems,
        subtotal,
        // You can add shipping, tax, etc. here
        shipping: subtotal > 0 ? 0 : 0, // Free shipping
        total: subtotal,
      },
    });
  } catch (error) {
    console.error("Get cart summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart summary",
      error: error.message,
    });
  }
};

// Helper function to get cart with product details
const getCartWithDetails = async (userId) => {
  const cartItems = await Cart.findAll({
    where: {
      userId,
    },
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

  // Calculate totals
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

  return {
    items: cartItems,
    totalItems,
    subtotal,
    shipping: subtotal > 0 ? 0 : 0, // Free shipping
    total: subtotal,
  };
};
