import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import User from "./User.js";

const Coupon = sequelize.define("Coupon", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  discount_type: {
    type: DataTypes.ENUM("percentage", "fixed"),
    allowNull: false,
  },
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  max_discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  usage_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Total allowed uses; null = unlimited",
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  per_user_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Max uses per user; null = unlimited",
  },
  min_subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  scope: {
    type: DataTypes.ENUM("all", "category", "product", "user"),
    defaultValue: "all",
  },
  category_list: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  product_ids: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  user_ids: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  created_by: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "users",
      key: "id",
    },
  },
  updated_by: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: "users",
      key: "id",
    },
  },
}, {
  timestamps: true,
  tableName: "coupons",
  underscored: true,
  indexes: [
    { name: "idx_coupons_code", unique: true, fields: ["code"] },
    { name: "idx_coupons_active", fields: ["is_active"] },
    { name: "idx_coupons_date", fields: ["start_date", "end_date"] },
  ],
});

// Optional association for created_by
User.hasMany(Coupon, { foreignKey: "created_by", as: "createdCoupons" });
Coupon.belongsTo(User, { foreignKey: "created_by", as: "creator" });

export default Coupon;
