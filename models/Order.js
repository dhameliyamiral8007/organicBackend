import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import User from "./User.js";

const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "users",
      key: "id",
    },
  },
  status: {
    type: DataTypes.ENUM("pending", "confirmed", "processing", "shipped", "delivered", "cancelled"),
    allowNull: false,
    defaultValue: "pending",
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  shippingCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  couponCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  couponDiscount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  // Customer Information
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  // Shipping Address
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // Billing Address (optional, defaults to shipping)
  billingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // Payment Information
  paymentMethod: {
    type: DataTypes.ENUM("cod", "online", "wallet"),
    allowNull: false,
    defaultValue: "cod",
  },
  paymentStatus: {
    type: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
    allowNull: false,
    defaultValue: "pending",
  },
  // Order Notes
  orderNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Delivery Information
  estimatedDelivery: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  trackingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: "orders",
  underscored: true,
  indexes: [
    {
      name: "idx_orders_user_id",
      fields: ["user_id"],
    },
    {
      name: "idx_orders_status",
      fields: ["status"],
    },
    {
      name: "idx_orders_order_number",
      fields: ["order_number"],
    },
    {
      name: "idx_orders_created_at",
      fields: ["created_at"],
    },
  ],
});

// Association with User
User.hasMany(Order, { foreignKey: "userId", as: "orders" });
Order.belongsTo(User, { foreignKey: "userId", as: "user" });

export default Order;
