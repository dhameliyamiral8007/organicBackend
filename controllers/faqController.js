import FAQ from "../models/FAQ.js";
import { body, validationResult } from "express-validator";
import { sequelize } from "../config/sequelize.js";
import { Op } from "sequelize";

// Validation for FAQ
export const validateFAQ = [
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required"),
  
  body("question")
    .trim()
    .notEmpty()
    .withMessage("Question is required")
    .isLength({ min: 5, max: 500 })
    .withMessage("Question must be between 5 and 500 characters"),
  
  body("answer")
    .notEmpty()
    .withMessage("Answer is required"),
  
  body("orderIndex")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order index must be a non-negative integer"),
  
  body("isActive")
    .optional()
    .toBoolean(),
];

// Admin: Create FAQ
export const createFAQ = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { category, question, answer, orderIndex, isActive } = req.body;

    const faq = await FAQ.create({
      category,
      question,
      answer,
      order_index: orderIndex || 0,
      is_active: isActive !== undefined ? isActive : true,
      created_by: req.admin.id,
    });

    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (error) {
    console.error("Create faq error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create faq",
      error: error.message,
    });
  }
};

// Admin: Update FAQ
export const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { category, question, answer, orderIndex, isActive } = req.body;

    await faq.update({
      category: category !== undefined ? category : faq.category,
      question: question !== undefined ? question : faq.question,
      answer: answer !== undefined ? answer : faq.answer,
      order_index: orderIndex !== undefined ? orderIndex : faq.order_index,
      is_active: isActive !== undefined ? isActive : faq.is_active,
    });

    res.json({
      success: true,
      message: "FAQ updated successfully",
      data: faq,
    });
  } catch (error) {
    console.error("Update faq error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update faq",
      error: error.message,
    });
  }
};

// Admin: Delete FAQ
export const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    await faq.destroy();

    res.json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Delete faq error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete faq",
      error: error.message,
    });
  }
};

// Public: Get All FAQs (Grouped by Category)
export const getAllFAQs = async (req, res) => {
  try {
    const { category, search } = req.query;

    const isAdminMode = req.admin !== undefined;

    const whereClause = {};
    if (!isAdminMode) {
      whereClause.is_active = true;
    }

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { question: { [Op.iLike]: `%${search}%` } },
        { answer: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const faqs = await FAQ.findAll({
      where: whereClause,
      order: [["category", "ASC"], ["order_index", "ASC"], ["createdAt", "DESC"]],
    });

    // Group by category
    const groupedFAQs = faqs.reduce((acc, faq) => {
      const cat = faq.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(faq);
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedFAQs,
    });
  } catch (error) {
    console.error("Get all faqs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch faqs",
      error: error.message,
    });
  }
};

// Public/Admin: Get FAQ Categories
export const getFAQCategories = async (req, res) => {
  try {
    const categories = await FAQ.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      where: { is_active: true },
      raw: true
    });

    res.json({
      success: true,
      data: categories.map(c => c.category),
    });
  } catch (error) {
    console.error("Get faq categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch faq categories",
      error: error.message,
    });
  }
};

// Admin: Get FAQ by ID
export const getFAQById = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("Get faq by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch faq",
      error: error.message,
    });
  }
};
