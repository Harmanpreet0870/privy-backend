import express from "express";
import { accessChat, fetchChats } from "../controllers/ChatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, accessChat);
router.get("/", protect, fetchChats);

export default router;
