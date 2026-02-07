import Media from "../models/Media.js";
import User from "../models/User.js";
import { body, validationResult } from "express-validator";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import path from "path";
import { sequelize } from "../config/sequelize.js";
import { Op } from "sequelize";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage (direct Cloudinary upload)
const storage = multer.memoryStorage();

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    image: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
    pdf: ["application/pdf"],
    document: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    video: ["video/mp4", "video/avi", "video/mov", "video/wmv"],
  };

  const allAllowedTypes = [...allowedTypes.image, ...allowedTypes.pdf, ...allowedTypes.document, ...allowedTypes.video];
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${Object.values(allowedTypes).flat().join(", ")}`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 5, // Max 5 files at once
  },
});

// Upload helper function
const uploadToCloudinary = (buffer, folder, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    console.log("Uploading to Cloudinary:", { folder, resourceType });
    
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `organic-backend/${folder}`,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: true,
        format: resourceType === "raw" ? "pdf" : undefined,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          console.log("Cloudinary upload success:", result);
          resolve(result);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Validation middleware
export const validateMediaUpload = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Title must be between 2 and 255 characters"),
  
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must not exceed 2000 characters"),
  
  body("type")
    .optional()
    .isIn(["image", "pdf", "document", "video"])
    .withMessage("Invalid type"),
  
  body("category")
    .optional()
    .isIn(["about_us", "products", "services", "blog", "gallery", "documents", "other"])
    .withMessage("Invalid category"),
  
  body("alt")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Alt text must not exceed 255 characters"),
  
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),
  
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),
];

// Admin: Upload media files
export const uploadMedia = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { title, description, type = "auto", category = "other", alt, tags = [], sortOrder = 0 } = req.body;
    const adminId = req.admin.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        // Determine resource type based on file mimetype
        let resourceType = "auto";
        if (file.mimetype.startsWith("image/")) {
          resourceType = "image";
        } else if (file.mimetype === "application/pdf") {
          resourceType = "raw";
        } else if (file.mimetype.includes("document") || file.mimetype.includes("sheet")) {
          resourceType = "raw";
        } else if (file.mimetype.startsWith("video/")) {
          resourceType = "video";
        }

        // Upload to Cloudinary
        const result = await uploadToCloudinary(file.buffer, category, resourceType);

        // Create media record
        const media = await Media.create({
          uploadedBy: adminId,
          title,
          description,
          type: type === "auto" ? (resourceType === "image" ? "image" : resourceType === "video" ? "video" : "pdf") : type,
          category,
          fileName: result.public_id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          url: resourceType === "raw" ? `${result.secure_url}?download=true` : result.secure_url,
          publicId: result.public_id,
          secureUrl: resourceType === "raw" ? `${result.secure_url}?download=true` : result.secure_url,
          thumbnailUrl: resourceType === "image" ? cloudinary.url(result.public_id, { width: 300, height: 300, crop: "fill" }) : null,
          alt,
          tags: Array.isArray(tags) ? tags : [],
          sortOrder: sortOrder !== undefined && sortOrder !== null && sortOrder !== "" ? parseInt(sortOrder) : 0,
          metadata: {
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: result.resource_type,
            createdAt: result.created_at,
          },
        });

        uploadedFiles.push(media);
      } catch (uploadError) {
        console.error("Upload error for file:", file.originalname, uploadError);
        return res.status(500).json({
          success: false,
          message: `Failed to upload file: ${file.originalname}`,
          error: uploadError.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload media",
      error: error.message,
    });
  }
};

// Admin: Get all media
export const getAllMedia = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type = "", 
      category = "", 
      search = "",
      isActive = ""
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = {};
    
    if (type) {
      whereClause.type = type;
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (isActive !== "") {
      whereClause.is_active = isActive === "true";
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { original_name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: media } = await Media.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["sort_order", "ASC"], ["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalMedia: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

// Admin: Get media by ID
export const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findByPk(id, {
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error("Get media by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

// Admin: Update media
export const updateMedia = async (req, res) => {
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
    const { title, description, category, alt, tags, sortOrder, isActive } = req.body;

    const media = await Media.findByPk(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    await media.update({
      title,
      description,
      category,
      alt,
      tags: Array.isArray(tags) ? tags : [],
      sortOrder: sortOrder !== undefined && sortOrder !== null && sortOrder !== "" ? parseInt(sortOrder) : media.sort_order,
      is_active: isActive !== undefined ? isActive : media.is_active,
    });

    res.json({
      success: true,
      message: "Media updated successfully",
      data: media,
    });
  } catch (error) {
    console.error("Update media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update media",
      error: error.message,
    });
  }
};

// Admin: Delete media
export const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findByPk(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    // Delete from Cloudinary
    if (media.publicId) {
      try {
        await cloudinary.uploader.destroy(media.publicId);
      } catch (cloudinaryError) {
        console.error("Cloudinary delete error:", cloudinaryError);
        // Continue with database deletion even if Cloudinary delete fails
      }
    }

    await media.destroy();

    res.json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    console.error("Delete media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete media",
      error: error.message,
    });
  }
};

// Public: Get media by category (for frontend use)
export const getMediaByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 50 } = req.query;

    const media = await Media.findAll({
      where: {
        category,
        is_active: true,
      },
      attributes: [
        "id",
        "title",
        "description",
        "type",
        "url",
        "secureUrl",
        "thumbnailUrl",
        "alt",
        "tags",
        "sortOrder",
        "metadata",
        "created_at",
      ],
      order: [["sort_order", "ASC"], ["created_at", "DESC"]],
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error("Get media by category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

// Public: Get single media by ID (for frontend use)
export const getPublicMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findOne({
      where: {
        id,
        is_active: true,
      },
      attributes: [
        "id",
        "title",
        "description",
        "type",
        "url",
        "secureUrl",
        "thumbnailUrl",
        "alt",
        "tags",
        "metadata",
        "created_at",
      ],
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error("Get public media by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

export { upload };
