const express = require("express");
const router = express.Router();
const Event = require("../Event");
const User = require("../User");
const { authenticate } = require("../../middleware/authMiddleware");

// ✅ Get all events with optional category filter
router.get("/", authenticate, async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) {
      query.category = { $in: category.split(",") };
    }

    const events = await Event.find(query)
      .populate("club")
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// ✅ Get past events grouped by month
router.get("/past", authenticate, async (req, res) => {
  const { year, month } = req.query;
  const userId = req.user.userId;

  try {
    let dateQuery = { $lt: new Date() };
    if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      dateQuery = { $gte: start, $lte: end };
    }

    const events = await Event.find({
      participants: userId,
      date: dateQuery
    }).populate("club").sort({ date: -1 });

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch past events" });
  }
});

// POST /api/events/register/:eventId
router.post("/register/:eventId", authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Update User and add 20 points
    await User.findByIdAndUpdate(userId, {
      $addToSet: { registeredEvents: eventId },
      $inc: { points: 20 }
    });

    // Update Event
    await Event.findByIdAndUpdate(eventId, {
      $addToSet: { participants: userId }
    });

    res.json({ message: "Successfully registered! +20 points awarded." });
  } catch (error) {
    res.status(500).json({ error: "Server error registering for event" });
  }
});

module.exports = router;