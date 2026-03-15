import Subscriber from "../models/Subscriber.js";

const subscriberController = {
  /**
   * Subscribe a new email
   */
  subscribe: async (req, res) => {
    try {
      const { email, message } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Check if already subscribed
      const existingSubscriber = await Subscriber.findOne({ where: { email } });
      if (existingSubscriber) {
        return res.status(400).json({
          success: false,
          message: "Email is already subscribed",
        });
      }

      const newSubscriber = await Subscriber.create({
        email,
        message,
      });

      res.status(201).json({
        success: true,
        message: "Subscribed successfully",
        data: {
          id: newSubscriber.id,
          email: newSubscriber.email,
          createdAt: newSubscriber.createdAt,
        },
      });
    } catch (error) {
      console.error("Subscription Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  /**
   * Get all subscribers (Admin only)
   */
  getAllSubscribers: async (req, res) => {
    try {
      const { search } = req.query;
      const { Op } = (await import("sequelize")).default;

      let whereCondition = {};
      if (search) {
        whereCondition = {
          email: {
            [Op.iLike]: `%${search}%`,
          },
        };
      }

      const subscribers = await Subscriber.findAll({
        where: whereCondition,
        order: [["created_at", "DESC"]],
      });

      res.status(200).json({
        success: true,
        count: subscribers.length,
        search: search || null,
        data: subscribers,
      });
    } catch (error) {
      console.error("Get Subscribers Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
};

export default subscriberController;
