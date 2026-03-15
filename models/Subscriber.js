import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

const Subscriber = sequelize.define("Subscriber", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: "subscribers",
  underscored: true,
  indexes: [
    {
      name: "idx_subscribers_email",
      unique: true,
      fields: ["email"],
    },
    {
      name: "idx_subscribers_created_at",
      fields: ["created_at"],
    },
  ],
});

export default Subscriber;
