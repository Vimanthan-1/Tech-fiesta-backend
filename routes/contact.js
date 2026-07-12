const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "Name, email, subject, and message are required",
      });
    }

    const db = admin.firestore();
    const contactMessagesRef = db.collection("contact_messages");

    const messageData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      createdAt: admin.firestore.Timestamp.now(),
      status: "unread",
    };

    const docRef = await contactMessagesRef.add(messageData);

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
      },
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error saving contact message:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message",
      message: error.message,
    });
  }
});

module.exports = router;
