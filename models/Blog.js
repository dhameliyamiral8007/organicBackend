import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

const Blog = sequelize.define("Blog", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255],
    },
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  content: {
    type: DataTypes.TEXT("long"),
    allowNull: false,
  },
  excerpt: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  author: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "Admin",
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "General",
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  featured_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  meta_title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  meta_description: {
    type: DataTypes.TEXT,
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
  tableName: "blogs",
  underscored: true,
  indexes: [
    {
      name: "idx_blogs_slug",
      unique: true,
      fields: ["slug"],
    },
    {
      name: "idx_blogs_is_published",
      fields: ["is_published"],
    },
    {
      name: "idx_blogs_category",
      fields: ["category"],
    }
  ],
});

export default Blog;
