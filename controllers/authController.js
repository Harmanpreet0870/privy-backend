// File: backend/controllers/authController.js
// REPLACE your entire authController.js with this:

import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, uniqueId } = req.body;

    console.log("📝 Register attempt:", { username, email, uniqueId });

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    // Check if user exists
    const userExists = await User.findOne({ 
      $or: [{ email }, { uniqueId }] 
    });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      uniqueId: uniqueId || email,
    });

    console.log("✅ User registered:", user._id);

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      uniqueId: user.uniqueId,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt:", email);

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("❌ Invalid password for:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("✅ User logged in:", user._id);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      uniqueId: user.uniqueId,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ getMe error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const userId = req.user._id;

    console.log("🔄 Update profile:", userId);

    const updateData = {};
    if (username) updateData.username = username;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Profile updated:", user._id);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      uniqueId: user.uniqueId,
      avatar: user.avatar,
    });
  } catch (err) {
    console.error("❌ Update profile error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Get all users except current user
// @route   GET /api/auth/all
// @access  Private
export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    console.log("👥 Fetching all users except:", currentUserId);

    const users = await User.find({ 
      _id: { $ne: currentUserId } 
    }).select("-password");

    console.log(`✅ Found ${users.length} users`);

    res.json(users);
  } catch (err) {
    console.error("❌ getAllUsers error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};