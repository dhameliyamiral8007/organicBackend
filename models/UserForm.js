import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import User from "./User.js";

const UserForm = sequelize.define("UserForm", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: "users",
      key: "id",
    },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [2, 255],
    },
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
  subject: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM("general", "support", "feedback", "complaint", "suggestion", "other"),
    allowNull: false,
    defaultValue: "general",
  },
  priority: {
    type: DataTypes.ENUM("low", "medium", "high", "urgent"),
    allowNull: false,
    defaultValue: "medium",
  },
  status: {
    type: DataTypes.ENUM("pending", "in_progress", "resolved", "closed"),
    allowNull: false,
    defaultValue: "pending",
  },
  adminResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  respondedBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: "users",
      key: "id",
    },
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
}, {
  timestamps: true,
  tableName: "user_forms",
  underscored: true,
  indexes: [
    {
      name: "idx_user_forms_user_id",
      fields: ["user_id"],
    },
    {
      name: "idx_user_forms_status",
      fields: ["status"],
    },
    {
      name: "idx_user_forms_category",
      fields: ["category"],
    },
    {
      name: "idx_user_forms_priority",
      fields: ["priority"],
    },
    {
      name: "idx_user_forms_created_at",
      fields: ["created_at"],
    },
  ],
});

// Associations
User.hasMany(UserForm, { foreignKey: "userId", as: "userForms" });
UserForm.belongsTo(User, { foreignKey: "userId", as: "user" });
UserForm.belongsTo(User, { foreignKey: "respondedBy", as: "responder" });

export default UserForm;
