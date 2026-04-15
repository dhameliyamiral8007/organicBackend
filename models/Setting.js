import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

const Setting = sequelize.define("Setting", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  timestamps: true,
});

export default Setting;
