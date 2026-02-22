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
  
  body("variantIndex")
    .optional()
    .isInt({ min: 0 })
    .withMessage("variantIndex must be 0 or greater"),
  
  body("variantLabel")
    .optional()
    .isString()
    .withMessage("variantLabel must be a string"),
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

    const { productId, quantity, variantIndex, variantLabel } = req.body;
    const userId = req.user.id;
    const normalizedVariantIndex = typeof variantIndex === "string" ? parseInt(variantIndex) : variantIndex;

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

    // Resolve price/stock based on variant selection
    let unitPrice = parseFloat(product.price);
    let availableStock = product.stock;
    let resolvedVariantLabel = null;
    let resolvedVariantImage = null;

    if (typeof normalizedVariantIndex === "number" && !Number.isNaN(normalizedVariantIndex)) {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const variant = variants[normalizedVariantIndex];
      if (!variant) {
        return res.status(400).json({
          success: false,
          message: "Invalid variant selected",
        });
      }
      unitPrice = parseFloat(variant.price ?? unitPrice);
      availableStock = parseInt(variant.stock ?? 0);
      resolvedVariantLabel = variant.label ?? variantLabel ?? null;
      resolvedVariantImage = variant.image?.url ?? null;
    }

    // Check if product/variant has sufficient stock
    if (availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${availableStock} items available`,
      });
    }

    // Check if item already exists in cart
    const existingCartItem = await Cart.findOne({
      where: {
        userId,
        productId,
        variantIndex: (typeof normalizedVariantIndex === "number" && !Number.isNaN(normalizedVariantIndex)) ? normalizedVariantIndex : null,
      },
    });

    let cartItem;

    if (existingCartItem) {
      // Update existing cart item
      const newQuantity = existingCartItem.quantity + quantity;
      
      if (availableStock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Only ${availableStock} items available`,
        });
      }

      const totalPrice = unitPrice * newQuantity;
      
      await existingCartItem.update({
        quantity: newQuantity,
        totalPrice,
      });

      cartItem = existingCartItem;
    } else {
      // Create new cart item
      const totalPrice = unitPrice * quantity;
      
      cartItem = await Cart.create({
        userId,
        productId,
        quantity,
        price: unitPrice,
        totalPrice,
        variantIndex: (typeof normalizedVariantIndex === "number" && !Number.isNaN(normalizedVariantIndex)) ? normalizedVariantIndex : null,
        variantLabel: resolvedVariantLabel ?? variantLabel ?? null,
        variantImage: resolvedVariantImage ?? product.featured_image ?? null,
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
          attributes: ["id", "name", "price", "stock", "is_available", "featured_image", "variants"],
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
    let availableStock = cartItem.product.stock;
    let unitPrice = parseFloat(cartItem.price ?? cartItem.product.price);
    if (typeof cartItem.variantIndex === "number") {
      const variants = Array.isArray(cartItem.product.variants) ? cartItem.product.variants : [];
      const variant = variants[cartItem.variantIndex];
      availableStock = parseInt(variant?.stock ?? 0);
      unitPrice = parseFloat(variant?.price ?? unitPrice);
    }
    if (availableStock < newQuantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${availableStock} items available`,
      });
    }

    // Update cart item
    const totalPrice = unitPrice * newQuantity;
    
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
          attributes: ["id", "name", "price", "stock", "is_available", "featured_image", "variants"],
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
    const unitPrice = parseFloat(cartItem.price ?? cartItem.product.price);
    const totalPrice = unitPrice * newQuantity;
    
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
          attributes: ["id", "name", "price", "stock", "is_available", "featured_image", "variants"],
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

    // Variant-aware stock
    let availableStock = cartItem.product.stock;
    let unitPrice = parseFloat(cartItem.price ?? cartItem.product.price);
    if (typeof cartItem.variantIndex === "number") {
      const variants = Array.isArray(cartItem.product.variants) ? cartItem.product.variants : [];
      const variant = variants[cartItem.variantIndex];
      availableStock = parseInt(variant?.stock ?? 0);
      unitPrice = parseFloat(variant?.price ?? unitPrice);
    }
    if (availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${availableStock} items available`,
      });
    }

    // Update cart item
    const totalPrice = unitPrice * quantity;
    
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
          "is_available",
          "variants"
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
