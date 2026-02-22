import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

const Product = sequelize.define("Product", {
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
      len: [1, 255],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 255],
    },
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      isIn: [
        ["vegetables", "fruits", "grains", "dairy", "herbs", "organic", "natural", "other"]
      ],
    },
  },
  subcategory: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  manufactured_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  marketed_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  form: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [["powder", "liquid", "granules", "tablet", "capsule", "other"]],
    },
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  variants: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: "Array of variant objects: {label, price, stock, image}",
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  featured_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_organic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  key_features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  nutritional_info: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  weight: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: "Weight in grams or kg",
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "pcs",
    validate: {
      isIn: [["pcs", "kg", "g", "ltr", "ml", "dozen", "packet"]],
    },
  },
  discount: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5,
    },
  },
  review_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  views: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
    },
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
  tableName: "products",
  underscored: true,
  indexes: [
    {
      name: "idx_products_category",
      fields: ["category"],
    },
    {
      name: "idx_products_is_available",
      fields: ["is_available"],
    },
    {
      name: "idx_products_is_featured",
      fields: ["is_featured"],
    },
    {
      name: "idx_products_price",
      fields: ["price"],
    },
    {
      name: "idx_products_rating",
      fields: ["rating"],
    },
    {
      name: "idx_products_created_at",
      fields: ["created_at"],
    },
  ],
});

export default Product;
