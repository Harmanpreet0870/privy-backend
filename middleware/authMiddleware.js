import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    req.user = await User.findById(decoded.id).select("-password"); // remove password

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    next(); // continue to next middleware/controller
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

export default authMiddleware;
