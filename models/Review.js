import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import User from "./User.js";
import Product from "./Product.js";

const Review = sequelize.define("Review", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "products",
      key: "id",
    },
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "users",
      key: "id",
    },
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    allowNull: false,
    defaultValue: "pending",
  },
}, {
  timestamps: true,
  tableName: "reviews",
  underscored: true,
  indexes: [
    {
      name: "idx_reviews_product_id",
      fields: ["product_id"],
    },
    {
      name: "idx_reviews_user_id",
      fields: ["user_id"],
    },
    {
      name: "idx_reviews_status",
      fields: ["status"],
    },
    {
      name: "idx_reviews_created_at",
      fields: ["created_at"],
    },
  ],
});

// Associations
Product.hasMany(Review, { foreignKey: "productId", as: "reviews" });
Review.belongsTo(Product, { foreignKey: "productId", as: "product" });

User.hasMany(Review, { foreignKey: "userId", as: "reviews" });
Review.belongsTo(User, { foreignKey: "userId", as: "user" });

export default Review;
