import express from "express";
import multer from "multer";
import path from "path";
import {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getBlogBySlug,
  getBlogById,
  validateBlog,
} from "../controllers/blogController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

const storage = multer.memoryStorage();

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
    files: 1,
  },
  fileFilter,
});

// Admin routes
router.post(
  "/admin/blogs",
  authenticateAdmin,
  upload.single("image"),
  validateBlog,
  createBlog
);

router.put(
  "/admin/blogs/:id",
  authenticateAdmin,
  upload.single("image"),
  validateBlog,
  updateBlog
);

router.delete(
  "/admin/blogs/:id",
  authenticateAdmin,
  deleteBlog
);

router.get(
  "/admin/blogs/:id",
  authenticateAdmin,
  getBlogById
);

router.get(
  "/admin/blogs",
  authenticateAdmin,
  getAllBlogs
);

// User side (Public) routes
router.get("/blogs", getAllBlogs);
router.get("/blogs/:slug", getBlogBySlug);

export default router;
