// controllers/chatController.js
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

/**
 * @desc   Access an existing 1-to-1 chat OR create a new one
 * @route  POST /api/chats
 * @access Private
 */
export const accessChat = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: "UserId is required" });

  try {
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, userId] },
    })
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username uniqueId avatar" },
      });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user._id, userId],
      });

      chat = await Chat.findById(chat._id)
        .populate("participants", "-password")
        .populate({
          path: "lastMessage",
          populate: { path: "sender", select: "username uniqueId avatar" },
        });
    }

    res.status(200).json(chat);
  } catch (err) {
    console.error("❌ accessChat error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc   Fetch all 1-to-1 chats for the logged-in user
 * @route  GET /api/chats
 * @access Private
 */
export const fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username uniqueId avatar" },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json(chats);
  } catch (err) {
    console.error("❌ fetchChats error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc   Delete all messages in a chat & reset lastMessage
 * @route  DELETE /api/chats/:chatId
 * @access Private
 */


export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // only participants can delete
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // delete all messages in this chat
    await Message.deleteMany({ chatId });

    // delete the chat
    await Chat.findByIdAndDelete(chatId);

    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (err) {
    console.error("❌ deleteChat error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

