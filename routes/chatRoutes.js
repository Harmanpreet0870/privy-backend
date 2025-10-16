// routes/chatRoutes.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  accessChat,
  fetchChats,
  deleteChat,
} from "../controllers/chatController.js";

const router = express.Router();

router.post("/", authMiddleware, accessChat);
router.get("/", authMiddleware, fetchChats);

// 🆕 Delete chat route
router.delete("/:chatId", authMiddleware, deleteChat);

export default router;
