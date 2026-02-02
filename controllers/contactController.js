import Contact from "../models/Contact.js";
import User from "../models/User.js";
import { body, validationResult } from "express-validator";
import { sequelize } from "../config/sequelize.js";
import { Op } from "sequelize";

export const validateContactForm = [
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
    .withMessage("Please provide a valid email"),
  
  body("phone")
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
  
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 5, max: 255 })
    .withMessage("Subject must be between 5 and 255 characters"),
  
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Message must be between 10 and 2000 characters"),
  
  body("category")
    .optional()
    .isIn(["general", "technical", "billing", "feedback", "complaint", "other"])
    .withMessage("Invalid category"),
  
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority"),
];

export const validateAdminResponse = [
  body("response")
    .trim()
    .notEmpty()
    .withMessage("Response is required")
    .isLength({ min: 5, max: 2000 })
    .withMessage("Response must be between 5 and 2000 characters"),
  
  body("status")
    .optional()
    .isIn(["pending", "in_progress", "resolved", "closed"])
    .withMessage("Invalid status"),
];

// User side: Submit contact form
export const submitContactForm = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { name, email, phone, subject, message, category = "general", priority = "medium" } = req.body;
    const userId = req.user ? req.user.id : null; // Allow non-logged-in users

    const contact = await Contact.create({
      userId,
      name,
      email,
      phone,
      subject,
      message,
      category,
      priority,
    });

    res.status(201).json({
      success: true,
      message: "Contact form submitted successfully. We will get back to you soon!",
      data: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        category: contact.category,
        priority: contact.priority,
        status: contact.status,
        createdAt: contact.created_at,
      },
    });
  } catch (error) {
    console.error("Submit contact form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit contact form",
      error: error.message,
    });
  }
};

// User side: Get user's own contact submissions
export const getUserContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: contacts } = await Contact.findAndCountAll({
      where: { userId },
      attributes: [
        "id",
        "name",
        "email",
        "subject",
        "category",
        "priority",
        "status",
        "adminResponse",
        "respondedAt",
        "created_at",
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalContacts: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get user contacts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
      error: error.message,
    });
  }
};

// Admin side: Get all contact submissions
export const getAllContacts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = "", 
      category = "",
      priority = "",
      search = "",
      startDate = "",
      endDate = ""
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = {};
    
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
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { subject: { [Op.iLike]: `%${search}%` } },
        { message: { [Op.iLike]: `%${search}%` } },
      ];
    }
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const { count, rows: contacts } = await Contact.findAndCountAll({
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
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalContacts: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all contacts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
      error: error.message,
    });
  }
};

// Admin side: Get specific contact by ID
export const getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: User,
          as: "responder",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("Get contact by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact",
      error: error.message,
    });
  }
};

// Admin side: Respond to contact
export const respondToContact = async (req, res) => {
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
    const { response, status = "in_progress" } = req.body;
    const adminId = req.admin.id;

    const contact = await Contact.findByPk(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    await contact.update({
      adminResponse: response,
      status,
      respondedBy: adminId,
      respondedAt: new Date(),
    });

    // Get updated contact with admin details
    const updatedContact = await Contact.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "responder",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Response submitted successfully",
      data: updatedContact,
    });
  } catch (error) {
    console.error("Respond to contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit response",
      error: error.message,
    });
  }
};

// Admin side: Update contact status
export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const contact = await Contact.findByPk(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    await contact.update({ status });

    res.json({
      success: true,
      message: "Contact status updated successfully",
      data: contact,
    });
  } catch (error) {
    console.error("Update contact status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update contact status",
      error: error.message,
    });
  }
};

// Admin side: Delete contact
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByPk(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    await contact.destroy();

    res.json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete contact",
      error: error.message,
    });
  }
};

// Admin side: Get contact statistics
export const getContactStats = async (req, res) => {
  try {
    // Total contacts
    const totalContacts = await Contact.count();

    // Contacts by status
    const contactsByStatus = await Contact.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
    });

    // Contacts by category
    const contactsByCategory = await Contact.findAll({
      attributes: [
        "category",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["category"],
    });

    // Contacts by priority
    const contactsByPriority = await Contact.findAll({
      attributes: [
        "priority",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["priority"],
    });

    // Recent contacts (last 7 days)
    const recentContacts = await Contact.count({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Pending contacts
    const pendingContacts = await Contact.count({
      where: { status: "pending" },
    });

    res.json({
      success: true,
      data: {
        totalContacts,
        recentContacts,
        pendingContacts,
        contactsByStatus: contactsByStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.dataValues.count);
          return acc;
        }, {}),
        contactsByCategory: contactsByCategory.reduce((acc, item) => {
          acc[item.category] = parseInt(item.dataValues.count);
          return acc;
        }, {}),
        contactsByPriority: contactsByPriority.reduce((acc, item) => {
          acc[item.priority] = parseInt(item.dataValues.count);
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Get contact stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact statistics",
      error: error.message,
    });
  }
};
