import { body, validationResult } from "express-validator";
import { Op } from "sequelize";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

export const validateCoupon = [
  body("code").trim().notEmpty().withMessage("Code is required"),
  body("discountType").isIn(["percentage", "fixed"]).withMessage("Invalid discount type"),
  body("discountValue").isFloat({ gt: 0 }).withMessage("Discount value must be > 0"),
  body("maxDiscount").optional().isFloat({ gt: 0 }).withMessage("maxDiscount must be > 0"),
  body("startDate").optional().isISO8601().toDate(),
  body("endDate").optional().isISO8601().toDate(),
  body("usageLimit").optional().isInt({ min: 1 }),
  body("perUserLimit").optional().isInt({ min: 1 }),
  body("minSubtotal").optional().isFloat({ min: 0 }),
  body("scope").optional().isIn(["all", "category", "product", "user"]),
  body("categoryList").optional(),
  body("productIds").optional(),
  body("userIds").optional(),
];

export const createCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation errors", errors: errors.array() });
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      startDate,
      endDate,
      usageLimit,
      perUserLimit,
      minSubtotal,
      scope = "all",
      categoryList,
      productIds,
      userIds,
    } = req.body;

    const normalizedCode = String(code).toUpperCase().trim();

    const coupon = await Coupon.create({
      code: normalizedCode,
      description,
      discount_type: discountType,
      discount_value: discountValue,
      max_discount: maxDiscount || null,
      start_date: startDate || null,
      end_date: endDate || null,
      usage_limit: usageLimit || null,
      per_user_limit: perUserLimit || null,
      min_subtotal: minSubtotal || 0,
      scope,
      category_list: categoryList ? (typeof categoryList === "string" ? JSON.parse(categoryList) : categoryList) : [],
      product_ids: productIds ? (typeof productIds === "string" ? JSON.parse(productIds) : productIds) : [],
      user_ids: userIds ? (typeof userIds === "string" ? JSON.parse(userIds) : userIds) : [],
      created_by: req.admin.id,
      updated_by: req.admin.id,
    });

    res.status(201).json({ success: true, message: "Coupon created", data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create coupon", error: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation errors", errors: errors.array() });
    }
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });

    const payload = { ...req.body };
    if (payload.code) payload.code = String(payload.code).toUpperCase().trim();
    if (payload.categoryList) payload.category_list = typeof payload.categoryList === "string" ? JSON.parse(payload.categoryList) : payload.categoryList;
    if (payload.productIds) payload.product_ids = typeof payload.productIds === "string" ? JSON.parse(payload.productIds) : payload.productIds;
    if (payload.userIds) payload.user_ids = typeof payload.userIds === "string" ? JSON.parse(payload.userIds) : payload.userIds;
    payload.updated_by = req.admin.id;

    await coupon.update({
      code: payload.code ?? coupon.code,
      description: payload.description ?? coupon.description,
      discount_type: payload.discountType ?? coupon.discount_type,
      discount_value: payload.discountValue ?? coupon.discount_value,
      max_discount: payload.maxDiscount ?? coupon.max_discount,
      start_date: payload.startDate ?? coupon.start_date,
      end_date: payload.endDate ?? coupon.end_date,
      usage_limit: payload.usageLimit ?? coupon.usage_limit,
      per_user_limit: payload.perUserLimit ?? coupon.per_user_limit,
      min_subtotal: payload.minSubtotal ?? coupon.min_subtotal,
      scope: payload.scope ?? coupon.scope,
      category_list: payload.category_list ?? coupon.category_list,
      product_ids: payload.product_ids ?? coupon.product_ids,
      user_ids: payload.user_ids ?? coupon.user_ids,
      updated_by: payload.updated_by,
    });

    res.json({ success: true, message: "Coupon updated", data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update coupon", error: error.message });
  }
};

export const getAllCoupons = async (req, res) => {
  try {
    const { search = "", isActive } = req.query;
    const where = {};
    if (search) where[Op.or] = [{ code: { [Op.iLike]: `%${search}%` } }, { description: { [Op.iLike]: `%${search}%` } }];
    if (isActive !== undefined) where.is_active = isActive === "true";
    const coupons = await Coupon.findAll({ where, order: [["created_at", "DESC"]] });
    res.json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch coupons", error: error.message });
  }
};

export const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch coupon", error: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    await coupon.destroy();
    res.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete coupon", error: error.message });
  }
};

export const validateCouponForUser = async (req, res) => {
  try {
    const { code } = req.query;
    const userId = req.user.id;
    if (!code) return res.status(400).json({ success: false, message: "Coupon code required" });
    const normalizedCode = String(code).toUpperCase().trim();
    const coupon = await Coupon.findOne({ where: { code: normalizedCode, is_active: true } });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found or inactive" });

    const now = new Date();
    if (coupon.start_date && now < new Date(coupon.start_date)) return res.status(400).json({ success: false, message: "Coupon not started yet" });
    if (coupon.end_date && now > new Date(coupon.end_date)) return res.status(400).json({ success: false, message: "Coupon expired" });
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    if (Array.isArray(coupon.user_ids) && coupon.user_ids.length && !coupon.user_ids.includes(userId)) return res.status(400).json({ success: false, message: "Coupon not allowed for this user" });

    // Per-user usage count via Orders
    if (coupon.per_user_limit) {
      const usedCount = await Order.count({ where: { userId, couponCode: normalizedCode } });
      if (usedCount >= coupon.per_user_limit) {
        return res.status(400).json({ success: false, message: "Coupon per-user limit reached" });
      }
    }

    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to validate coupon", error: error.message });
  }
};

export const getEligibleCouponsForUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const coupons = await Coupon.findAll({
      where: {
        is_active: true,
        [Op.and]: [
          {
            [Op.or]: [
              { start_date: null },
              { start_date: { [Op.lte]: now } },
            ],
          },
          {
            [Op.or]: [
              { end_date: null },
              { end_date: { [Op.gte]: now } },
            ],
          },
        ],
      },
      order: [["created_at", "DESC"]],
    });

    // Fetch user's cart with product details
    const cart = await Cart.findAll({
      where: { userId },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "category"],
        },
      ],
    });

    const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

    const results = [];
    for (const c of coupons) {
      let eligibleSubtotal = 0;
      let reason = null;

      // Scope calculation
      if (c.scope === "all") {
        eligibleSubtotal = subtotal;
      } else if (c.scope === "product" && Array.isArray(c.product_ids) && c.product_ids.length) {
        eligibleSubtotal = cart
          .filter(ci => c.product_ids.includes(ci.productId))
          .reduce((s, ci) => s + parseFloat(ci.totalPrice), 0);
        if (eligibleSubtotal === 0) reason = "No eligible products in cart";
      } else if (c.scope === "category" && Array.isArray(c.category_list) && c.category_list.length) {
        eligibleSubtotal = cart
          .filter(ci => c.category_list.includes(ci.product.category))
          .reduce((s, ci) => s + parseFloat(ci.totalPrice), 0);
        if (eligibleSubtotal === 0) reason = "No eligible categories in cart";
      } else if (c.scope === "user") {
        if (Array.isArray(c.user_ids) && c.user_ids.length && !c.user_ids.includes(userId)) {
          eligibleSubtotal = 0;
          reason = "Not allowed for this user";
        } else {
          eligibleSubtotal = subtotal;
        }
      } else {
        eligibleSubtotal = subtotal;
      }

      // Base rules
      let canApply = true;
      if (c.min_subtotal && parseFloat(c.min_subtotal) > subtotal) {
        canApply = false;
        reason = `Minimum subtotal ${c.min_subtotal} not met`;
      }
      if (c.usage_limit && c.usage_count >= c.usage_limit) {
        canApply = false;
        reason = "Global usage limit reached";
      }
      if (c.per_user_limit) {
        const usedCount = await Order.count({ where: { userId, couponCode: c.code } });
        if (usedCount >= c.per_user_limit) {
          canApply = false;
          reason = "Per-user limit reached";
        }
      }

      // Potential discount preview
      let potentialDiscount = 0;
      if (canApply && eligibleSubtotal > 0) {
        if (c.discount_type === "percentage") {
          potentialDiscount = (eligibleSubtotal * parseFloat(c.discount_value)) / 100;
          if (c.max_discount) {
            potentialDiscount = Math.min(potentialDiscount, parseFloat(c.max_discount));
          }
        } else {
          potentialDiscount = Math.min(parseFloat(c.discount_value), eligibleSubtotal);
        }
      }

      results.push({
        coupon: c,
        canApply,
        reason,
        eligibleSubtotal,
        potentialDiscount,
      });
    }

    res.json({
      success: true,
      data: {
        subtotal,
        coupons: results,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get eligible coupons", error: error.message });
  }
};
