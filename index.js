// File: backend/index.js
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

// Allowed origins for Socket.io and CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.CLIENT_URL, // Your live Netlify frontend
];

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Chat App API is running" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

// Store active users: { userId: socketId }
const activeUsers = new Map();

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // User comes online
  socket.on("user-online", (userId) => {
    activeUsers.set(userId, socket.id);
    io.emit("user-status-change", { userId, status: "online" });
    console.log(`👤 User ${userId} is online`);
  });

  // Join / leave chat rooms
  socket.on("join-chat", (chatId) => {
    socket.join(chatId);
    console.log(`💬 Socket ${socket.id} joined chat ${chatId}`);
  });
  socket.on("leave-chat", (chatId) => {
    socket.leave(chatId);
    console.log(`👋 Socket ${socket.id} left chat ${chatId}`);
  });

  // Handle messages
  socket.on("send-message", ({ chatId, message }) => {
    if (!chatId || !message) return;
    io.in(chatId).emit("receive-message", { ...message, chatId });
    console.log(`📨 Message broadcast to chat ${chatId}`);
  });

  // Typing indicators
  socket.on("typing", ({ chatId, userId, username }) => {
    socket.to(chatId).emit("user-typing", { userId, username });
  });
  socket.on("stop-typing", ({ chatId, userId }) => {
    socket.to(chatId).emit("user-stop-typing", { userId });
  });

  // Mark messages as seen
  socket.on("mark-as-seen", ({ chatId, messageId, userId }) => {
    socket.to(chatId).emit("message-seen", { messageId, userId });
  });

  // Disconnect
  socket.on("disconnect", () => {
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        io.emit("user-status-change", { userId, status: "offline" });
        console.log(`👤 User ${userId} went offline`);
        break;
      }
    }
    console.log("❌ User disconnected:", socket.id);
  });
});

// Make io accessible in routes if needed
app.set("io", io);

// Connect to MongoDB
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env");
  process.exit(1);
}
mongoose
  .connect(process.env.MONGO_URI)
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
