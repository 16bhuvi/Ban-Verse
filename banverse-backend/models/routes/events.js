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

// ✅ Get ALL past events, with isRegistered flag for the current user
// NOTE: Must be defined BEFORE /:id — otherwise Express catches "past" as an id
router.get("/past", authenticate, async (req, res) => {
  const { year, month } = req.query;
  const userId = req.user.userId;

  try {
    const now = new Date();
    let dateFilter;

    if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      dateFilter = { $gte: start, $lte: end };
    } else {
      dateFilter = { $lt: now };
    }

    // Fetch ALL past events: either date < now, OR isPast flag, OR date is null/missing
    const query = year && month
      ? { date: dateFilter }
      : {
          $or: [
            { date: { $lt: now } },
            { isPast: true },
            { date: null },
            { date: { $exists: false } }
          ]
        };

    const events = await Event.find(query)
      .populate("club", "name logo")
      .sort({ date: -1 })
      .lean();

    // Attach isRegistered flag to each event
    const eventsWithFlag = events.map(event => ({
      ...event,
      isRegistered: event.participants?.some(
        p => p.toString() === userId.toString()
      ) ?? false
    }));

    res.json(eventsWithFlag);
  } catch (err) {
    console.error("Past events error:", err);
    res.status(500).json({ error: "Failed to fetch past events" });
  }
});


// ✅ Get individual event detail
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).populate("club");
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch event details" });
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