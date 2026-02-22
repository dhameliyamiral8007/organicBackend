import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import Order from "./Order.js";
import Product from "./Product.js";

const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "orders",
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
    validate: {
      min: 1,
    },
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Price at the time of order",
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Total price for this item (price * quantity)",
  },
  // Product snapshot at time of order
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  productImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  productCategory: {
    type: DataTypes.STRING,
    allowNull: true,
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
  tableName: "order_items",
  underscored: true,
  indexes: [
    {
      name: "idx_order_items_order_id",
      fields: ["order_id"],
    },
    {
      name: "idx_order_items_product_id",
      fields: ["product_id"],
    },
  ],
});

// Associations
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "orderItems" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Product.hasMany(OrderItem, { foreignKey: "productId", as: "orderItems" });
OrderItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

export default OrderItem;
