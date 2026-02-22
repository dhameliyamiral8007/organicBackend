import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import User from "./User.js";
import Product from "./Product.js";

const Cart = sequelize.define("Cart", {
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
  productId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "products",
      key: "id",
    },
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
    },
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Price at the time of adding to cart",
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Total price for this cart item (price * quantity)",
  },
  variantIndex: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Selected variant index from product.variants",
  },
  variantLabel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  variantImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: "cart",
  underscored: true,
  indexes: [
    {
      name: "idx_cart_user_id",
      fields: ["user_id"],
    },
    {
      name: "idx_cart_product_id",
      fields: ["product_id"],
    },
    {
      name: "idx_cart_user_product_variant",
      unique: true,
      fields: ["user_id", "product_id", "variant_index"],
    },
  ],
});

// Define associations
User.hasMany(Cart, { foreignKey: "userId", as: "cartItems" });
Cart.belongsTo(User, { foreignKey: "userId", as: "user" });

Product.hasMany(Cart, { foreignKey: "productId", as: "cartItems" });
Cart.belongsTo(Product, { foreignKey: "productId", as: "product" });

export default Cart;
