import UserForm from "../models/UserForm.js";
import User from "../models/User.js";
import { body, validationResult } from "express-validator";
import { sequelize } from "../config/sequelize.js";
import { Op } from "sequelize";

// Validation middleware for user form submission
export const validateUserForm = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Name must be between 2 and 255 characters"),
  
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone number must not exceed 20 characters"),
  
  body("subject")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Subject must not exceed 500 characters"),
  
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required"),
  body("category")
    .optional()
    .isIn(["general", "support", "feedback", "complaint", "suggestion", "other"])
    .withMessage("Invalid category"),
  
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority"),
  
  body("inquiryType")
    .optional()
    .isIn([
      "Product Information",
      "Purchase Inquiry",
      "Bulk Order / Distributor Inquiry",
      "Farming Guidance",
      "Product Availability",
      "Partnership / Business Inquiry",
      "Complaint / Support",
      "Other"
    ])
    .withMessage("Invalid inquiry type"),
  
  body("productInterestedIn")
    .optional()
    .isIn([
      "Nisarg Poshan",
      "Nisarg Poshan – Vegetable",
      "Nisarg Poshan – Flower",
      "Nisarg Shakti",
      "Not Sure / Need Guidance"
    ])
    .withMessage("Invalid product selection"),
];

// User: Submit form
export const submitUserForm = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { 
      name, 
      email, 
      phone, 
      subject, 
      message, 
      category = "general", 
      priority = "medium",
      inquiryType,
      productInterestedIn
    } = req.body;
    
    // Get user ID if authenticated, otherwise null
    const userId = req.user ? req.user.id : null;
    
    // Get client info
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const userForm = await UserForm.create({
      userId,
      name,
      email,
      phone,
      subject,
      message,
      category,
      priority,
      inquiryType,
      productInterestedIn,
      ipAddress,
      userAgent,
      metadata: {
        submittedAt: new Date().toISOString(),
        source: 'web',
      },
    });

    res.status(201).json({
      success: true,
      message: "Form submitted successfully",
      data: {
        id: userForm.id,
        name: userForm.name,
        email: userForm.email,
        subject: userForm.subject,
        category: userForm.category,
        priority: userForm.priority,
        status: userForm.status,
        inquiryType: userForm.inquiryType,
        productInterestedIn: userForm.productInterestedIn,
        createdAt: userForm.createdAt,
      },
    });
  } catch (error) {
    console.error("Submit user form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit form",
      error: error.message,
    });
  }
};

// Admin: Get all user forms with pagination and filtering
export const getAllUserForms = async (req, res) => {
  try {
    console.log("hello get all user form ");
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { status, category, priority, search } = req.query;
    
    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (priority) {
      whereClause.priority = priority;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } },
        { inquiryType: { [Op.like]: `%${search}%` } },
        { productInterestedIn: { [Op.like]: `%${search}%` } },
      ];
    }

    const { inquiryType = "", productInterestedIn = "" } = req.query;
    if (inquiryType) whereClause.inquiryType = inquiryType;
    if (productInterestedIn) whereClause.productInterestedIn = productInterestedIn;

    const { count, rows: userForms } = await UserForm.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
          required: false,
        },
        {
          model: User,
          as: "responder",
          attributes: ["id", "name", "email"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        userForms,
        pagination: {
          currentPage: page,
          totalPages,
          totalForms: count,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all user forms error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user forms",
      error: error.message,
    });
  }
};

// Admin: Get user form by ID
export const getUserFormById = async (req, res) => {
  try {
    const { id } = req.params;

    const userForm = await UserForm.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
          required: false,
        },
        {
          model: User,
          as: "responder",
          attributes: ["id", "name", "email"],
          required: false,
        },
      ],
    });

    if (!userForm) {
      return res.status(404).json({
        success: false,
        message: "User form not found",
      });
    }

    res.json({
      success: true,
      data: userForm,
    });
  } catch (error) {
    console.error("Get user form by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user form",
      error: error.message,
    });
  }
};

// Admin: Respond to user form
export const respondToUserForm = async (req, res) => {
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
    const { adminResponse, status = "resolved" } = req.body;
    const adminId = req.admin.id;

    const userForm = await UserForm.findByPk(id);
    if (!userForm) {
      return res.status(404).json({
        success: false,
        message: "User form not found",
      });
    }

    await userForm.update({
      adminResponse,
      status,
      respondedBy: adminId,
      respondedAt: new Date(),
    });

    // Get updated form with responder details
    const updatedForm = await UserForm.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
          required: false,
        },
        {
          model: User,
          as: "responder",
          attributes: ["id", "name", "email"],
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      message: "Response submitted successfully",
      data: updatedForm,
    });
  } catch (error) {
    console.error("Respond to user form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit response",
      error: error.message,
    });
  }
};

// Admin: Update user form status
export const updateUserFormStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const userForm = await UserForm.findByPk(id);
    if (!userForm) {
      return res.status(404).json({
        success: false,
        message: "User form not found",
      });
    }

    await userForm.update({ status });

    res.json({
      success: true,
      message: "Status updated successfully",
      data: {
        id: userForm.id,
        status: userForm.status,
        updatedAt: userForm.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update user form status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

// Admin: Delete user form
export const deleteUserForm = async (req, res) => {
  try {
    const { id } = req.params;

    const userForm = await UserForm.findByPk(id);
    if (!userForm) {
      return res.status(404).json({
        success: false,
        message: "User form not found",
      });
    }

    await userForm.destroy();

    res.json({
      success: true,
      message: "User form deleted successfully",
    });
  } catch (error) {
    console.error("Delete user form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user form",
      error: error.message,
    });
  }
};

// Admin: Get user form statistics
export const getUserFormStats = async (req, res) => {
  try {
    const stats = await UserForm.findAll({
      attributes: [
        [
          sequelize.fn('COUNT', sequelize.col('id')),
          'totalForms'
        ],
        [
          sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "pending" THEN 1 END')),
          'pendingForms'
        ],
        [
          sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "in_progress" THEN 1 END')),
          'inProgressForms'
        ],
        [
          sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "resolved" THEN 1 END')),
          'resolvedForms'
        ],
        [
          sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "closed" THEN 1 END')),
          'closedForms'
        ],
      ],
      raw: true,
    });

    const inquiryTypeStats = await UserForm.findAll({
      attributes: [
        'inquiryType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['inquiryType'],
      raw: true,
    });

    const productStats = await UserForm.findAll({
      attributes: [
        'productInterestedIn',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['productInterestedIn'],
      raw: true,
    });

    const categoryStats = await UserForm.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true,
    });

    const priorityStats = await UserForm.findAll({
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority'],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        overview: stats[0],
        categoryBreakdown: categoryStats,
        priorityBreakdown: priorityStats,
        inquiryTypeBreakdown: inquiryTypeStats,
        productBreakdown: productStats,
      },
    });
  } catch (error) {
    console.error("Get user form stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message,
    });
  }
};

// User: Get user's own forms (if authenticated)
export const getUserOwnForms = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: userForms } = await UserForm.findAndCountAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        userForms,
        pagination: {
          currentPage: page,
          totalPages,
          totalForms: count,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get user own forms error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve your forms",
      error: error.message,
    });
  }
};
