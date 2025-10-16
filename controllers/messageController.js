import Message from "../models/Message.js";
import Chat from "../models/Chat.js";

/**
 * @desc    Send a new message in a chat
 * @route   POST /api/messages
 * @access  Private
 */
export const sendMessage = async (req, res) => {
  const { chatId, text } = req.body; // <-- match frontend
  const senderId = req.user._id;

  if (!chatId || !text) {
    return res
      .status(400)
      .json({ message: "chatId and text are required" });
  }

  try {
    // Create the message
    const message = await Message.create({
      chatId,
      sender: senderId,
      text,
    });

    // Update chat’s lastMessage
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    // Populate sender field to return full info
    const fullMessage = await message.populate(
      "sender",
      "username uniqueId avatar"
    );

    res.status(201).json(fullMessage);
  } catch (err) {
    console.error("❌ sendMessage error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc    Get all messages for a given chat
 * @route   GET /api/messages/:chatId
 * @access  Private
 */
export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .populate("sender", "username uniqueId avatar")
      .sort({ createdAt: 1 }); // oldest first

    res.status(200).json(messages);
  } catch (err) {
    console.error("❌ getMessages error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
