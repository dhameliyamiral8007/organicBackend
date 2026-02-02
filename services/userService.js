import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

class UserService {
  // Register new user (role: user)
  async register(userData) {
    console.log("Registration attempt with data:", userData);
    
    const { name, email, password, phone, address, role } = userData;

    // Check if user already exists
    console.log("Checking if user exists with email:", email);
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log("User already exists");
      throw new Error("User with this email already exists");
    }

    // Hash password
    console.log("Hashing password");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    console.log("Creating user with data:", {
      name,
      email,
      phone,
      address,
      role: "user"
    });
    
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      role: "user", // Always normalize to "user" for consistency
    });
    
    console.log("User created successfully:", user.id);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );
    
    console.log("Token generated successfully");

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
      token,
    };
  }

  // Login user
  async login(email, password) {
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
      token,
    };
  }

  // Get user profile
  async getProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "phone", "address", "role", "is_active", "createdAt"],
    });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  // Update user profile
  async updateProfile(userId, userData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const { name, phone, address } = userData;
    await user.update({ name, phone, address });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      updatedAt: user.updatedAt,
    };
  }

  // Get all users (admin only)
  async getAllUsers() {
    return await User.findAll({
      attributes: ["id", "name", "email", "phone", "address", "role", "is_active", "createdAt"],
      order: [["createdAt", "DESC"]],
    });
  }

  // -------- ADMIN USING SAME USER MODEL (role = 'admin') --------

  // Register admin
  async registerAdmin(adminData) {
    const { name, email, password } = adminData;

    // Check if user/admin already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      token,
    };
  }

  // Login admin
  async loginAdmin(email, password) {
    const admin = await User.findOne({ where: { email, role: "admin" } });
    if (!admin) {
      throw new Error("Invalid email or password");
    }

    if (!admin.is_active) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      token,
    };
  }

  // Get admin profile
  async getAdminProfile(adminId) {
    const admin = await User.findOne({
      where: { id: adminId, role: "admin" },
      attributes: ["id", "name", "email", "role", "is_active", "createdAt"],
    });
    if (!admin) {
      throw new Error("Admin not found");
    }
    return admin;
  }

  // Update admin profile
  async updateAdminProfile(adminId, adminData) {
    const admin = await User.findOne({ where: { id: adminId, role: "admin" } });
    if (!admin) {
      throw new Error("Admin not found");
    }

    const { name } = adminData;
    await admin.update({ name });

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      updatedAt: admin.updatedAt,
    };
  }
}

export default new UserService();
