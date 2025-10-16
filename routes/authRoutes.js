import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import {
  registerUser,
  loginUser,
  updateProfile,
  getMe,
  getAllUsers,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js"; // Adjust path if needed

const router = express.Router();

// ============================
// Existing Auth Routes
// ============================
router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/update", authMiddleware, updateProfile);
router.get("/me", authMiddleware, getMe);
router.get("/all", authMiddleware, getAllUsers);

// ============================
// Forgot Password Route
// ============================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Security best practice: don't reveal if user exists
    if (!user) {
      return res.status(200).json({
        message: "If that email exists, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"${process.env.APP_NAME || "Your App"}" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Hi ${user.username},</p>
             <p>Click this link to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>
             <p>This link expires in 1 hour.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Password reset link has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      message: "Failed to send reset email. Please try again later.",
    });
  }
});

// ============================
// Reset Password Route
// ============================
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    user.password = password; // Assumes User model hashes password
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Password has been reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: "Failed to reset password. Please try again.",
    });
  }
});

export default router;
