import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import User from "./User.js";

const CheckoutSession = sequelize.define("CheckoutSession", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "users",
      key: "id",
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  billingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  currentStep: {
    type: DataTypes.ENUM("phone", "customer-details", "shipping-address", "payment", "completed"),
    allowNull: false,
    defaultValue: "phone",
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  },
}, {
  timestamps: true,
  tableName: "checkout_sessions",
  underscored: true,
  indexes: [
    {
      name: "idx_checkout_sessions_user_id",
      fields: ["user_id"],
    },
    {
      name: "idx_checkout_sessions_expires_at",
      fields: ["expires_at"],
    },
  ],
});

// Associations
User.hasMany(CheckoutSession, { foreignKey: "userId", as: "checkoutSessions" });
CheckoutSession.belongsTo(User, { foreignKey: "userId", as: "user" });

export default CheckoutSession;
