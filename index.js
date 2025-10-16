// File: backend/index.js
// REPLACE your entire index.js with this:

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000", 
      "http://localhost:3001"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ⚠️ MIDDLEWARE MUST COME FIRST - BEFORE ROUTES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Chat App API is running" });
});

// API Routes - AFTER middleware
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

// Store active users: { userId: socketId }
const activeUsers = new Map();

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // User joins with their userId
  socket.on("user-online", (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`👤 User ${userId} is online with socket ${socket.id}`);
    
    // Broadcast online status to all users
    io.emit("user-status-change", { userId, status: "online" });
  });

  // User joins a specific chat room
  socket.on("join-chat", (chatId) => {
    socket.join(chatId);
    console.log(`💬 Socket ${socket.id} joined chat ${chatId}`);
  });

  // User leaves a chat room
  socket.on("leave-chat", (chatId) => {
    socket.leave(chatId);
    console.log(`👋 Socket ${socket.id} left chat ${chatId}`);
  });

  // Handle new message event - FIXED
  socket.on("send-message", (data) => {
    const { chatId, message } = data;
    
    if (!chatId || !message) {
      console.error("❌ Invalid message data:", data);
      return;
    }
    
    // Ensure chatId is in the message
    const messageWithChatId = { ...message, chatId };
    
    // Broadcast to everyone in the room INCLUDING sender
    io.in(chatId).emit("receive-message", messageWithChatId);
    
    console.log(`📨 Message broadcast to chat ${chatId}:`, message._id || "new");
  });

  // Handle typing indicator
  socket.on("typing", ({ chatId, userId, username }) => {
    socket.to(chatId).emit("user-typing", { userId, username });
  });

  socket.on("stop-typing", ({ chatId, userId }) => {
    socket.to(chatId).emit("user-stop-typing", { userId });
  });

  // Handle message seen/read
  socket.on("mark-as-seen", ({ chatId, messageId, userId }) => {
    socket.to(chatId).emit("message-seen", { messageId, userId });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    
    // Find and remove user from activeUsers
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        io.emit("user-status-change", { userId, status: "offline" });
        console.log(`👤 User ${userId} went offline`);
        break;
      }
    }
  });
});

// Make io accessible in routes (optional)
app.set("io", io);

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env file");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

export { io };