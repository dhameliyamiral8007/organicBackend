import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import User from "./User.js";

const Media = sequelize.define("Media", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  uploadedBy: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "users",
      key: "id",
    },
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [2, 255],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM("image", "pdf", "document", "video"),
    allowNull: false,
    defaultValue: "image",
  },
  category: {
    type: DataTypes.ENUM("about_us", "products", "services", "blog", "gallery", "documents", "other"),
    allowNull: false,
    defaultValue: "other",
  },
  fileName: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  originalName: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isUrl: true,
    },
  },
  publicId: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  secureUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  thumbnailUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  alt: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
}, {
  timestamps: true,
  tableName: "media",
  underscored: true,
  indexes: [
    {
      name: "idx_media_uploaded_by",
      fields: ["uploaded_by"],
    },
    {
      name: "idx_media_type",
      fields: ["type"],
    },
    {
      name: "idx_media_category",
      fields: ["category"],
    },
    {
      name: "idx_media_is_active",
      fields: ["is_active"],
    },
    {
      name: "idx_media_sort_order",
      fields: ["sort_order"],
    },
  ],
});

// Associations
User.hasMany(Media, { foreignKey: "uploadedBy", as: "uploadedMedia" });
Media.belongsTo(User, { foreignKey: "uploadedBy", as: "uploader" });

export default Media;
