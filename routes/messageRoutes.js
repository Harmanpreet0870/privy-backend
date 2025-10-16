import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getMessages, sendMessage } from "../controllers/messageController.js";

const router = express.Router();

// Get all messages of a chat
router.get("/:chatId", authMiddleware, getMessages);

// Send a new message
router.post("/", authMiddleware, sendMessage);

export default router;
