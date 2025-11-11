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

// ✅ Updated Allowed Origins for CORS + Socket.io
const allowedOrigins = [
  process.env.CLIENT_URL,             // main Netlify site (from .env)
  "https://privy001.netlify.app",     // permanent production domain
  /\.netlify\.app$/                   // allow all Netlify preview builds
];

// ✅ CORS for REST API
app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server or Postman requests with no origin
      if (!origin) return callback(null, true);

      // check if origin is allowed
      const isAllowed = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin)
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Socket.io with same CORS policy
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Test route
app.get("/", (req, res) => {
  res.json({ message: "✅ Privy backend running successfully!" });
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

// ✅ Active users map
const activeUsers = new Map();

// ✅ Socket.io connection handler
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("user-online", (userId) => {
    activeUsers.set(userId, socket.id);
    io.emit("user-status-change", { userId, status: "online" });
    console.log(`👤 User ${userId} is online`);
  });

  socket.on("join-chat", (chatId) => {
    socket.join(chatId);
    console.log(`💬 Socket ${socket.id} joined chat ${chatId}`);
  });

  socket.on("leave-chat", (chatId) => {
    socket.leave(chatId);
    console.log(`👋 Socket ${socket.id} left chat ${chatId}`);
  });

  socket.on("send-message", ({ chatId, message }) => {
    if (!chatId || !message) return;
    io.in(chatId).emit("receive-message", { ...message, chatId });
    console.log(`📨 Message broadcast to chat ${chatId}`);
  });

  socket.on("typing", ({ chatId, userId, username }) => {
    socket.to(chatId).emit("user-typing", { userId, username });
  });

  socket.on("stop-typing", ({ chatId, userId }) => {
    socket.to(chatId).emit("user-stop-typing", { userId });
  });

  socket.on("mark-as-seen", ({ chatId, messageId, userId }) => {
    socket.to(chatId).emit("message-seen", { messageId, userId });
  });

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

// ✅ Make io accessible in routes if needed
app.set("io", io);

// ✅ Connect to MongoDB
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

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

export { io };
