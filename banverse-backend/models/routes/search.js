const express = require("express");
const router = express.Router();
const Event = require("../Event");
const Club = require("../Club");
const { authenticate } = require("../../middleware/authMiddleware");

// GET /api/search?q=query
router.get("/", authenticate, async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ events: [], clubs: [] });

    try {
        const regex = new RegExp(q, "i");

        const events = await Event.find({
            $or: [
                { title: regex },
                { description: regex },
                { category: regex }
            ]
        }).populate("club").limit(10);

        const clubs = await Club.find({
            $or: [
                { name: regex },
                { description: regex },
                { category: regex }
            ]
        }).limit(10);

        res.json({ events, clubs });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Search failed" });
    }
});

module.exports = router;
