import Testimonial from "../models/Testimonial.js";
import { body, validationResult } from "express-validator";

// Validation for Testimonial
export const validateTestimonial = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),
  
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required"),
  
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  
  body("orderIndex")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order index must be a non-negative integer"),
];

// Admin: Create Testimonial
export const createTestimonial = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { name, designation, content, rating, imageUrl, orderIndex, isActive } = req.body;

    const testimonial = await Testimonial.create({
      name,
      designation,
      content,
      rating: rating || 5,
      image_url: imageUrl,
      order_index: orderIndex || 0,
      is_active: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: "Testimonial created successfully",
      data: testimonial,
    });
  } catch (error) {
    console.error("Create testimonial error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create testimonial",
      error: error.message,
    });
  }
};

// Admin: Update Testimonial
export const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findByPk(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    const { name, designation, content, rating, imageUrl, orderIndex, isActive } = req.body;

    await testimonial.update({
      name: name !== undefined ? name : testimonial.name,
      designation: designation !== undefined ? designation : testimonial.designation,
      content: content !== undefined ? content : testimonial.content,
      rating: rating !== undefined ? rating : testimonial.rating,
      image_url: imageUrl !== undefined ? imageUrl : testimonial.image_url,
      order_index: orderIndex !== undefined ? orderIndex : testimonial.order_index,
      is_active: isActive !== undefined ? isActive : testimonial.is_active,
    });

    res.json({
      success: true,
      message: "Testimonial updated successfully",
      data: testimonial,
    });
  } catch (error) {
    console.error("Update testimonial error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update testimonial",
      error: error.message,
    });
  }
};

// Admin: Delete Testimonial
export const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findByPk(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    await testimonial.destroy();

    res.json({
      success: true,
      message: "Testimonial deleted successfully",
    });
  } catch (error) {
    console.error("Delete testimonial error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete testimonial",
      error: error.message,
    });
  }
};

// Public: Get All Active Testimonials
export const getPublicTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.findAll({
      where: { is_active: true },
      order: [["order_index", "ASC"], ["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: testimonials,
    });
  } catch (error) {
    console.error("Get testimonials error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials",
      error: error.message,
    });
  }
};

// Admin: Get All Testimonials
export const getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.findAll({
      order: [["order_index", "ASC"], ["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: testimonials,
    });
  } catch (error) {
    console.error("Get all testimonials error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials",
      error: error.message,
    });
  }
};

// Admin: Get Testimonial by ID
export const getTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findByPk(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    res.json({
      success: true,
      data: testimonial,
    });
  } catch (error) {
    console.error("Get testimonial by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch testimonial",
      error: error.message,
    });
  }
};
