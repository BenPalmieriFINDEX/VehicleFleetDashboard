const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { chatWithFleetAssistant } = require('../services/ai');

// POST /api/ai/chat
router.post('/chat', authMiddleware, async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'BadRequest', message: 'messages array required', statusCode: 400 });
    }

    const response = await chatWithFleetAssistant(messages, req.user);
    res.json({ message: response });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
