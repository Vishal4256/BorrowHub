import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/messages - Retrieve messages between current user and another party, or all user conversations
router.get('/', protect, async (req, res) => {
  try {
    const { withUser, bookingId } = req.query;

    if (withUser && !mongoose.Types.ObjectId.isValid(withUser)) {
      return res.status(400).json({ error: 'Invalid withUser ID.' });
    }

    if (bookingId && !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Invalid bookingId.' });
    }

    // Security check: Query MUST include req.user._id so third parties cannot inspect private chats
    let filter;
    if (withUser) {
      filter = {
        $or: [
          { sender: req.user._id, recipient: withUser },
          { sender: withUser, recipient: req.user._id }
        ]
      };
    } else {
      filter = {
        $or: [{ sender: req.user._id }, { recipient: req.user._id }]
      };
    }

    if (bookingId) {
      filter.booking = bookingId;
    }

    // Pagination support
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 100));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate('sender', 'name avatar role')
        .populate('recipient', 'name avatar role')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(filter)
    ]);

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Total-Pages', Math.ceil(total / limit) || 1);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve messages', details: err.message });
  }
});

// POST /api/messages - Send message
router.post('/', protect, async (req, res) => {
  try {
    const { recipientId, text, bookingId } = req.body;

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ error: 'A valid recipientId is required.' });
    }

    if (recipientId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot send messages to yourself.' });
    }

    const recipientExists = await User.findById(recipientId);
    if (!recipientExists) {
      return res.status(404).json({ error: 'Recipient user does not exist.' });
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (text.trim().length > 5000) {
      return res.status(400).json({ error: 'Message exceeds maximum allowed length of 5000 characters.' });
    }

    if (bookingId && !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Invalid bookingId.' });
    }

    const msg = new Message({
      sender: req.user._id,
      recipient: recipientId,
      booking: bookingId || null,
      text: text.trim()
    });

    const saved = await msg.save();
    const populated = await Message.findById(saved._id)
      .populate('sender', 'name avatar role')
      .populate('recipient', 'name avatar role');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

export default router;
