import Blog from "../models/Blog.js";
import { body, validationResult } from "express-validator";
import { uploadImage, deleteImage, getOptimizedUrl } from "../config/cloudinary.js";
import { sequelize } from "../config/sequelize.js";
import { Op } from "sequelize";

// Validation for Blog
export const validateBlog = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be between 3 and 255 characters"),
  
  body("content")
    .notEmpty()
    .withMessage("Content is required"),
  
  body("category")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category cannot be empty if provided"),
    
  body("isPublished")
    .optional()
    .toBoolean(),
  
  body("tags")
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      }
      return Array.isArray(value);
    })
    .withMessage("Tags must be an array"),
];

// Helper to generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Admin: Create Blog
export const createBlog = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { title, content, excerpt, author, category, tags, isPublished, metaTitle, metaDescription } = req.body;
    
    let slug = generateSlug(title);
    
    // Check if slug exists
    const existingBlog = await Blog.findOne({ where: { slug } });
    if (existingBlog) {
      slug = `${slug}-${Date.now()}`;
    }

    let featuredImage = null;
    if (req.file) {
      const result = await uploadImage(req.file.buffer, "blogs");
      featuredImage = getOptimizedUrl(result.public_id);
    }

    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt,
      author: author || "Admin",
      category: category || "General",
      tags: typeof tags === 'string' ? JSON.parse(tags) : (tags || []),
      featured_image: featuredImage,
      is_published: isPublished === true || isPublished === 'true',
      published_at: (isPublished === true || isPublished === 'true') ? new Date() : null,
      meta_title: metaTitle,
      meta_description: metaDescription,
      created_by: req.admin.id,
    });

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Create blog error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create blog",
      error: error.message,
    });
  }
};

// Admin: Update Blog
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
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

    const { title, content, excerpt, author, category, tags, isPublished, metaTitle, metaDescription } = req.body;
    
    const updateData = {
      content,
      excerpt,
      author,
      category,
      meta_title: metaTitle,
      meta_description: metaDescription,
    };

    if (title && title !== blog.title) {
      updateData.title = title;
      let slug = generateSlug(title);
      const existingBlog = await Blog.findOne({ where: { slug, id: { [Op.ne]: id } } });
      if (existingBlog) {
        slug = `${slug}-${Date.now()}`;
      }
      updateData.slug = slug;
    }

    if (tags) {
      updateData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    if (isPublished !== undefined) {
      const published = isPublished === true || isPublished === 'true';
      updateData.is_published = published;
      if (published && !blog.is_published) {
        updateData.published_at = new Date();
      }
    }

    if (req.file) {
      // Delete old image if exists
      if (blog.featured_image) {
        const publicId = blog.featured_image.split('/').pop().split('.')[0];
        try {
          await deleteImage(publicId);
        } catch (e) {
          console.error("Old image deletion failed:", e);
        }
      }
      const result = await uploadImage(req.file.buffer, "blogs");
      updateData.featured_image = getOptimizedUrl(result.public_id);
    }

    await blog.update(updateData);

    res.json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Update blog error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update blog",
      error: error.message,
    });
  }
};

// Admin: Delete Blog
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    if (blog.featured_image) {
      const publicId = blog.featured_image.split('/').pop().split('.')[0];
      try {
        await deleteImage(publicId);
      } catch (e) {
        console.error("Image deletion failed:", e);
      }
    }

    await blog.destroy();

    res.json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Delete blog error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete blog",
      error: error.message,
    });
  }
};

// Public: Get All Blogs
export const getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (page - 1) * limit;

    // If it's an admin route or has admin credentials in request (handled by middleware)
    const isAdminMode = req.admin !== undefined;

    const whereClause = {};
    if (!isAdminMode) {
      whereClause.is_published = true;
    }

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: blogs } = await Blog.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["published_at", "DESC"], ["created_at", "DESC"]],
      attributes: isAdminMode ? undefined : { exclude: ["meta_title", "meta_description"] }
    });

    res.json({
      success: true,
      data: blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all blogs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
      error: error.message,
    });
  }
};

// Public: Get Blog by Slug
export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({
      where: { slug, is_published: true }
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    await blog.increment("views");

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Get blog by slug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog",
      error: error.message,
    });
  }
};

// Admin: Get Blog by ID
export const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Get blog by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog",
      error: error.message,
    });
  }
};
