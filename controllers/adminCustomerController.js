import User from "../models/User.js";
import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Product from "../models/Product.js";
import { sequelize } from "../config/sequelize.js";
import { Op } from "sequelize";

export const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: customers } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "address",
        "role",
        "is_active",
        "created_at",
      ],
      include: [
        {
          model: Order,
          as: "orders",
          attributes: ["id", "order_number", "status", "total_amount", "created_at"],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Calculate order statistics for each customer
    const customersWithStats = customers.map(customer => {
      const customerData = customer.toJSON();
      const orders = customerData.orders || [];
      
      return {
        ...customerData,
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0),
        lastOrderDate: orders.length > 0 ? orders[0].created_at : null,
      };
    });

    res.json({
      success: true,
      data: {
        customers: customersWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalCustomers: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all customers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await User.findByPk(id, {
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "address",
        "role",
        "is_active",
        "created_at",
        "updated_at",
      ],
      include: [
        {
          model: Order,
          as: "orders",
          attributes: [
            "id",
            "order_number",
            "status",
            "subtotal",
            "shipping_cost",
            "tax",
            "total_amount",
            "payment_method",
            "payment_status",
            "created_at",
          ],
          include: [
            {
              model: OrderItem,
              as: "orderItems",
              attributes: [
                "id",
                "quantity",
                "price",
                "totalPrice",
                "productName",
                "productImage",
                "productCategory",
              ],
            },
          ],
          order: [["created_at", "DESC"]],
        },
      ],
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const customerData = customer.toJSON();
    const orders = customerData.orders || [];
    
    // Calculate customer statistics
    const statistics = {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) / orders.length : 0,
      lastOrderDate: orders.length > 0 ? orders[0].created_at : null,
      ordersByStatus: orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json({
      success: true,
      data: {
        customer: {
          ...customerData,
          statistics,
        },
      },
    });
  } catch (error) {
    console.error("Get customer by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = "", 
      search = "",
      startDate = "",
      endDate = ""
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { order_number: { [Op.iLike]: `%${search}%` } },
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          attributes: [
            "id",
            "quantity",
            "price",
            "totalPrice",
            "productName",
            "productImage",
            "productCategory",
          ],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "featured_image"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalOrders: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          attributes: [
            "id",
            "quantity",
            "price",
            "totalPrice",
            "productName",
            "productImage",
            "productCategory",
          ],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "featured_image", "category"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone", "address"],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

export const getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({
      where: { order_number: orderNumber },
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          attributes: [
            "id",
            "quantity",
            "price",
            "totalPrice",
            "productName",
            "productImage",
            "productCategory",
          ],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "featured_image", "category"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone", "address"],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order by number error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, estimatedDelivery } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const updateData = { status };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);

    await order.update(updateData);

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    // Get total customers
    const totalCustomers = await User.count({
      where: { role: "user" },
    });

    // Get total orders
    const totalOrders = await Order.count();

    // Get total revenue
    const totalRevenue = await Order.sum("total_amount") || 0;

    // Get orders by status
    const ordersByStatus = await Order.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
    });

    // Get recent orders
    const recentOrders = await Order.findAll({
      limit: 5,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    // Get monthly revenue (last 6 months)
    const monthlyRevenue = await Order.findAll({
      attributes: [
        [sequelize.fn("DATE_TRUNC", "month", sequelize.col("created_at")), "month"],
        [sequelize.fn("SUM", sequelize.col("total_amount")), "revenue"],
        [sequelize.fn("COUNT", sequelize.col("id")), "orderCount"],
      ],
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
        },
      },
      group: [sequelize.fn("DATE_TRUNC", "month", sequelize.col("created_at"))],
      order: [[sequelize.fn("DATE_TRUNC", "month", sequelize.col("created_at")), "ASC"]],
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalCustomers,
          totalOrders,
          totalRevenue: parseFloat(totalRevenue),
          ordersByStatus: ordersByStatus.reduce((acc, item) => {
            acc[item.status] = parseInt(item.dataValues.count);
            return acc;
          }, {}),
        },
        recentOrders,
        monthlyRevenue: monthlyRevenue.map(item => ({
          month: item.dataValues.month,
          revenue: parseFloat(item.dataValues.revenue),
          orderCount: parseInt(item.dataValues.orderCount),
        })),
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};
