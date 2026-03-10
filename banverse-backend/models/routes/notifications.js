const express = require("express");
const router = express.Router();
const Notification = require("../Notification");
const { authenticate } = require("../../middleware/authMiddleware");

// GET /api/notifications
router.get("/", authenticate, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(20);

        const unreadCount = await Notification.countDocuments({
            userId: req.user.userId,
            read: false
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error("Fetch notifications error:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authenticate, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { read: true }
        );
        res.json({ message: "Notification marked as read" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update notification" });
    }
});

module.exports = router;
