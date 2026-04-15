import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

const Testimonial = sequelize.define("Testimonial", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  rating: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 5,
    },
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  tableName: "testimonials",
  underscored: true,
});

export default Testimonial;
