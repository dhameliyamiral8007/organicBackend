import Review from "../models/Review.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { sequelize } from "../config/sequelize.js";

const reviewController = {
  /**
   * Create a new review
   */
  createReview: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { productId, rating, comment } = req.body;
      const userId = req.user.id; // From auth middleware

      if (!productId || !rating) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Product ID and rating are required",
        });
      }

      // Check if product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if user already reviewed this product
      const existingReview = await Review.findOne({
        where: { productId, userId },
      });

      if (existingReview) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "You have already reviewed this product",
        });
      }

      // Create review
      const review = await Review.create(
        {
          productId,
          userId,
          rating,
          comment,
          status: "pending",
        },
        { transaction: t }
      );

      await t.commit();

      res.status(201).json({
        success: true,
        message: "Review submitted successfully and is awaiting admin approval",
        data: review,
      });
    } catch (error) {
      await t.rollback();
      console.error("Create Review Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  /**
   * Get reviews for a product
   */
  getProductReviews: async (req, res) => {
    try {
      const { productId } = req.params;

      const reviews = await Review.findAll({
        where: { productId, status: ["approved"] },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // Calculate breakdown
      const totalReviews = reviews.length;
      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let totalRating = 0;

      reviews.forEach((review) => {
        breakdown[review.rating]++;
        totalRating += review.rating;
      });

      const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

      res.status(200).json({
        success: true,
        count: totalReviews,
        averageRating: Number(averageRating),
        breakdown,
        data: reviews,
      });
    } catch (error) {
      console.error("Get Product Reviews Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  /**
   * Get all reviews for admin
   */
  getAdminReviews: async (req, res) => {
    try {
      const reviews = await Review.findAll({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          {
            model: Product,
            as: "product",
            attributes: ["id", "name"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      res.status(200).json({
        success: true,
        count: reviews.length,
        data: reviews,
      });
    } catch (error) {
      console.error("Get Admin Reviews Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  /**
   * Delete a review
   */
  deleteReview: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const review = await Review.findByPk(id);

      if (!review) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      // Check permissions (Admin or Owner)
      if (req.user.role !== "admin" && String(review.userId) !== String(req.user.id)) {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: "Unauthorized to delete this review",
        });
      }

      const productId = review.productId;
      await review.destroy({ transaction: t });

      // Recalculate rating
      const reviews = await Review.findAll({
        where: { productId, status: "approved" },
        transaction: t,
      });

      const reviewCount = reviews.length;
      const averageRating = reviewCount > 0 
        ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount
        : 0;

      await Product.update(
        {
          rating: averageRating,
          reviewCount: reviewCount,
        },
        { where: { id: productId }, transaction: t }
      );

      await t.commit();

      res.status(200).json({
        success: true,
        message: "Review deleted successfully",
      });
    } catch (error) {
      await t.rollback();
      console.error("Delete Review Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
  /**
   * Update review status (Approve/Reject) - Admin only
   */
  updateReviewStatus: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be 'approved' or 'rejected'",
        });
      }

      const review = await Review.findByPk(id);
      if (!review) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      const oldStatus = review.status;
      await review.update({ status }, { transaction: t });

      // If status changed to approved, or was approved and changed to something else, update product rating
      if (status === "approved" || oldStatus === "approved") {
        const productId = review.productId;
        const reviews = await Review.findAll({
          where: { productId, status: "approved" },
          transaction: t,
        });

        const reviewCount = reviews.length;
        const averageRating = reviewCount > 0 
          ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount
          : 0;

        await Product.update(
          {
            rating: averageRating,
            reviewCount: reviewCount,
          },
          { where: { id: productId }, transaction: t }
        );
      }

      await t.commit();

      res.status(200).json({
        success: true,
        message: `Review ${status} successfully`,
        data: review,
      });
    } catch (error) {
      await t.rollback();
      console.error("Update Review Status Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
};

export default reviewController;
