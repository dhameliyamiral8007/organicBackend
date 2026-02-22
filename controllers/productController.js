import Product from "../models/Product.js";
import { body, validationResult } from "express-validator";
import { uploadImage, uploadMultipleImages, deleteImage, getOptimizedUrl } from "../config/cloudinary.js";
import { sequelize } from "../config/sequelize.js";

export const validateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ max: 255 })
    .withMessage("Product name must be less than 255 characters"),
  
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),
  
  body("subtitle")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Subtitle must be less than 255 characters"),
  
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  
  body("category")
    .isIn(["vegetables", "fruits", "grains", "dairy", "herbs", "organic", "natural", "other"])
    .withMessage("Invalid category"),
  
  body("subcategory")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Subcategory must be less than 100 characters"),
  
  body("manufacturedBy")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Manufactured By must be less than 255 characters"),
  
  body("marketedBy")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Marketed By must be less than 255 characters"),
  
  body("color")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Color must be less than 100 characters"),
  
  body("form")
    .optional()
    .isIn(["powder", "liquid", "granules", "tablet", "capsule", "other"])
    .withMessage("Invalid form"),
  
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  
  body("isOrganic")
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return value === 'true' || value === 'false';
      }
      return typeof value === 'boolean';
    })
    .withMessage("isOrganic must be a boolean"),
  
  body("isAvailable")
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return value === 'true' || value === 'false';
      }
      return typeof value === 'boolean';
    })
    .withMessage("isAvailable must be a boolean"),
  
  body("isFeatured")
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return value === 'true' || value === 'false';
      }
      return typeof value === 'boolean';
    })
    .withMessage("isFeatured must be a boolean"),
  
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
  
  body("keyFeatures")
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
    .withMessage("Key features must be an array"),
  
  body("weight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Weight must be a positive number"),
  
  body("unit")
    .optional()
    .isIn(["pcs", "kg", "g", "ltr", "ml", "dozen", "packet"])
    .withMessage("Invalid unit"),
  
  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100"),
  
  body("variants")
    .optional()
    .custom((value) => {
      let parsed = value;
      if (typeof value === "string") {
        try {
          parsed = JSON.parse(value || "[]");
        } catch {
          return false;
        }
      }
      if (!Array.isArray(parsed)) return false;
      for (const v of parsed) {
        if (typeof v !== "object") return false;
        if (!("label" in v)) return false;
        if (!("price" in v)) return false;
      }
      return true;
    })
    .withMessage("Variants must be an array of {label, price, stock?, imageIndex?}"),
];

export const createProduct = async (req, res) => {
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
      description,
      subtitle,
      price,
      category,
      subcategory,
      manufacturedBy,
      marketedBy,
      color,
      form,
      stock,
      isOrganic,
      isAvailable,
      isFeatured,
      tags,
      keyFeatures,
      nutritionalInfo,
      weight,
      unit,
      discount,
      variants,
    } = req.body;

    // Parse form-data values
    const parsedIsOrganic = isOrganic === 'true' || isOrganic === true;
    const parsedIsAvailable = isAvailable === 'true' || isAvailable === true;
    const parsedIsFeatured = isFeatured === 'true' || isFeatured === true;
    
    let parsedTags = tags;
    let parsedKeyFeatures = keyFeatures;
    let parsedNutritionalInfo = nutritionalInfo;
    
    // Parse JSON strings from form-data
    if (typeof tags === 'string') {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = [];
      }
    }
    
    if (typeof keyFeatures === 'string') {
      try {
        parsedKeyFeatures = JSON.parse(keyFeatures);
      } catch (e) {
        parsedKeyFeatures = [];
      }
    }
    
    if (typeof nutritionalInfo === 'string') {
      try {
        parsedNutritionalInfo = JSON.parse(nutritionalInfo);
      } catch (e) {
        parsedNutritionalInfo = {};
      }
    }

    let uploadedImages = [];
    let featuredImage = null;
    let uploadedVariantImages = [];

    const filesIsArray = Array.isArray(req.files);
    const imagesFiles = filesIsArray ? req.files : (req.files?.images || []);
    const variantImagesFiles = filesIsArray ? [] : (req.files?.variantImages || []);

    if (imagesFiles && imagesFiles.length > 0) {
      try {
        uploadedImages = await uploadMultipleImages(
          imagesFiles.map((file) => file.buffer),
          "products"
        );

        if (uploadedImages.length > 0) {
          featuredImage = getOptimizedUrl(uploadedImages[0].public_id);
        }
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload images",
          error: uploadError.message,
        });
      }
    }

    if (variantImagesFiles && variantImagesFiles.length > 0) {
      try {
        uploadedVariantImages = await uploadMultipleImages(
          variantImagesFiles.map((file) => file.buffer),
          "products/variants"
        );
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload variant images",
          error: uploadError.message,
        });
      }
    }

    let parsedVariants = [];
    try {
      if (variants) {
        parsedVariants = typeof variants === "string" ? JSON.parse(variants) : variants;
      }
    } catch (e) {
      parsedVariants = [];
    }

    if (Array.isArray(parsedVariants) && uploadedVariantImages.length > 0) {
      parsedVariants = parsedVariants.map((v) => {
        if (typeof v.imageIndex === "number" && uploadedVariantImages[v.imageIndex]) {
          const img = uploadedVariantImages[v.imageIndex];
          return {
            ...v,
            image: {
              url: getOptimizedUrl(img.public_id),
              publicId: img.public_id,
              secureUrl: img.secure_url,
            },
          };
        }
        return v;
      });
    }

    const product = await Product.create({
      name,
      description,
      subtitle,
      price,
      category,
      subcategory,
      manufactured_by: manufacturedBy,
      marketed_by: marketedBy,
      color,
      form,
      stock,
      images: uploadedImages.map((img) => ({
        url: getOptimizedUrl(img.public_id),
        publicId: img.public_id,
        secureUrl: img.secure_url,
      })),
      featured_image: featuredImage,
      is_organic: parsedIsOrganic || false,
      is_available: parsedIsAvailable !== undefined ? parsedIsAvailable : true,
      is_featured: parsedIsFeatured || false,
      tags: parsedTags || [],
      key_features: parsedKeyFeatures || [],
      nutritional_info: parsedNutritionalInfo || {},
      variants: parsedVariants || [],
      weight,
      unit: unit || "pcs",
      discount: discount || 0,
      created_by: req.admin.id,
      updated_by: req.admin.id,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      isAvailable,
      isFeatured,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "DESC",
      search,
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (category) whereClause.category = category;
    if (isAvailable !== undefined) whereClause.is_available = isAvailable === "true";
    if (isFeatured !== undefined) whereClause.is_featured = isFeatured === "true";

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price[sequelize.Sequelize.Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.price[sequelize.Sequelize.Op.lte] = parseFloat(maxPrice);
    }

    if (search) {
      whereClause[sequelize.Sequelize.Op.or] = [
        { name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { tags: { [sequelize.Sequelize.Op.contains]: [search] } },
      ];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.increment("views");

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
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
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updateData = { ...req.body, updated_by: req.admin.id };

    const filesIsArray = Array.isArray(req.files);
    const imagesFiles = filesIsArray ? req.files : (req.files?.images || []);
    const variantImagesFiles = filesIsArray ? [] : (req.files?.variantImages || []);

    if (imagesFiles && imagesFiles.length > 0) {
      try {
        const newImages = await uploadMultipleImages(
          imagesFiles.map((file) => file.buffer),
          "products"
        );

        const existingImages = product.images || [];
        const updatedImages = [
          ...existingImages,
          ...newImages.map((img) => ({
            url: getOptimizedUrl(img.public_id),
            publicId: img.public_id,
            secureUrl: img.secure_url,
          })),
        ];

        updateData.images = updatedImages;

        if (!product.featured_image && newImages.length > 0) {
          updateData.featured_image = getOptimizedUrl(newImages[0].public_id);
        }
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload new images",
          error: uploadError.message,
        });
      }
    }

    if (variantImagesFiles && variantImagesFiles.length > 0) {
      try {
        const newVariantImages = await uploadMultipleImages(
          variantImagesFiles.map((file) => file.buffer),
          "products/variants"
        );

        let existingVariants = Array.isArray(product.variants) ? product.variants : [];
        const incomingVariants = updateData.variants
          ? (typeof updateData.variants === "string" ? JSON.parse(updateData.variants) : updateData.variants)
          : existingVariants;

        const updatedVariants = incomingVariants.map((v) => {
          if (typeof v.imageIndex === "number" && newVariantImages[v.imageIndex]) {
            const img = newVariantImages[v.imageIndex];
            return {
              ...v,
              image: {
                url: getOptimizedUrl(img.public_id),
                publicId: img.public_id,
                secureUrl: img.secure_url,
              },
            };
          }
          return v;
        });

        updateData.variants = updatedVariants;
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload new variant images",
          error: uploadError.message,
        });
      }
    } else if (updateData.variants) {
      updateData.variants = typeof updateData.variants === "string"
        ? JSON.parse(updateData.variants)
        : updateData.variants;
    }

    await product.update(updateData);

    res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.images && product.images.length > 0) {
      try {
        const deletePromises = product.images.map((img) =>
          deleteImage(img.publicId)
        );
        await Promise.all(deletePromises);
      } catch (deleteError) {
        console.error("Failed to delete images from Cloudinary:", deleteError);
      }
    }

    await product.destroy();

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

export const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 6 } = req.query;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const whereClause = {
      id: { [sequelize.Sequelize.Op.ne]: id },
      is_available: true,
    };

    // Add OR conditions for related products
    const orConditions = [];
    if (product.category) {
      orConditions.push({ category: product.category });
    }
    if (product.subcategory) {
      orConditions.push({ subcategory: product.subcategory });
    }
    // Skip tags comparison for now due to JSON operator issues
    // TODO: Implement tags comparison with proper PostgreSQL JSON operators

    if (orConditions.length > 0) {
      whereClause[sequelize.Sequelize.Op.or] = orConditions;
    }

    const relatedProducts = await Product.findAll({
      where: whereClause,
      limit: parseInt(limit),
      order: [
        [sequelize.Sequelize.literal(`CASE 
          WHEN category = '${product.category}' THEN 1 
          WHEN subcategory = '${product.subcategory}' THEN 2 
          ELSE 3 
        END`)],
        ["rating", "DESC"],
        ["views", "DESC"],
      ],
    });

    res.json({
      success: true,
      data: relatedProducts,
      message: "Related products fetched successfully",
    });
  } catch (error) {
    console.error("Get related products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch related products",
      error: error.message,
    });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const featuredProducts = await Product.findAll({
      where: {
        is_featured: true,
        is_available: true,
      },
      limit: parseInt(limit),
      order: [
        ["rating", "DESC"],
        ["views", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    res.json({
      success: true,
      data: featuredProducts,
    });
  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured products",
      error: error.message,
    });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "DESC" } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: products } = await Product.findAndCountAll({
      where: {
        category,
        is_available: true,
      },
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products by category",
      error: error.message,
    });
  }
};
