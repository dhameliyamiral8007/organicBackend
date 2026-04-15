import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

const FAQ = sequelize.define("FAQ", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "General",
    validate: {
      notEmpty: true,
    },
  },
  question: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [5, 500],
    },
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: "For manual sorting of FAQs",
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: "users",
      key: "id",
    },
  },
}, {
  timestamps: true,
  tableName: "faqs",
  underscored: true,
  indexes: [
    {
      name: "idx_faqs_category",
      fields: ["category"],
    },
    {
      name: "idx_faqs_is_active",
      fields: ["is_active"],
    },
    {
      name: "idx_faqs_order_index",
      fields: ["order_index"],
    }
  ],
});

export default FAQ;
