import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import User from "./User.js";

const Contact = sequelize.define("Contact", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: true, // Allow null for non-logged-in users
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
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [5, 255],
    },
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 2000],
    },
  },
  status: {
    type: DataTypes.ENUM("pending", "in_progress", "resolved", "closed"),
    allowNull: false,
    defaultValue: "pending",
  },
  priority: {
    type: DataTypes.ENUM("low", "medium", "high", "urgent"),
    allowNull: false,
    defaultValue: "medium",
  },
  category: {
    type: DataTypes.ENUM("general", "technical", "billing", "feedback", "complaint", "other"),
    allowNull: false,
    defaultValue: "general",
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
}, {
  timestamps: true,
  tableName: "contacts",
  underscored: true,
  indexes: [
    {
      name: "idx_contacts_user_id",
      fields: ["user_id"],
    },
    {
      name: "idx_contacts_status",
      fields: ["status"],
    },
    {
      name: "idx_contacts_priority",
      fields: ["priority"],
    },
    {
      name: "idx_contacts_category",
      fields: ["category"],
    },
    {
      name: "idx_contacts_created_at",
      fields: ["created_at"],
    },
  ],
});

// Associations
User.hasMany(Contact, { foreignKey: "userId", as: "contacts" });
Contact.belongsTo(User, { foreignKey: "userId", as: "user" });

// Admin response association
User.hasMany(Contact, { foreignKey: "respondedBy", as: "respondedContacts" });
Contact.belongsTo(User, { foreignKey: "respondedBy", as: "responder" });

export default Contact;
