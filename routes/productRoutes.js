import express from "express";
import multer from "multer";
import path from "path";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getRelatedProducts,
  getFeaturedProducts,
  getProductsByCategory,
  validateProduct,
} from "../controllers/productController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed"));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter,
});

router.post(
  "/admin/products",
  authenticateAdmin,
  upload.array("images", 10),
  validateProduct,
  createProduct
);

router.get("/products", getAllProducts);

router.get("/products/featured", getFeaturedProducts);

router.get("/products/category/:category", getProductsByCategory);

router.get("/products/:id", getProductById);

router.get("/products/:id/related", getRelatedProducts);

router.put(
  "/admin/products/:id",
  authenticateAdmin,
  upload.array("images", 10),
  validateProduct,
  updateProduct
);

router.delete(
  "/admin/products/:id",
  authenticateAdmin,
  deleteProduct
);

export default router;
