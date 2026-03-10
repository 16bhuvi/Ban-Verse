const express = require("express");
const router = express.Router();
const User = require("../User");
const Event = require("../Event");
const Club = require("../Club");
const { authenticate } = require("../../middleware/authMiddleware");

// GET /api/dashboard
router.get("/", authenticate, async (req, res) => {
    console.log("📥 Dashboard request received for user:", req.user.userId);
    try {
        const user = await User.findById(req.user.userId)
            .populate({ path: "joinedClubs", strictPopulate: false })
            .populate({ path: "registeredEvents", strictPopulate: false })
            .lean();

        if (!user) {
            console.log("❌ User not found in DB");
            return res.status(404).json({ error: "User not found" });
        }

        console.log("👤 User found:", user.fullName);

        // Get upcoming events
        const upcomingEvents = await Event.find({
            date: { $gte: new Date() }
        })
            .sort({ date: 1 })
            .limit(5)
            .lean();

        console.log("🗓️ Upcoming events found:", upcomingEvents.length);

        // Get recommended clubs (random for now)
        const recommendedClubs = await Club.find({
            _id: { $nin: user.joinedClubs || [] }
        })
            .limit(3)
            .lean();

        console.log("🛡️ Recommended clubs found:", recommendedClubs.length);

        res.json({
            user: {
                fullName: user.fullName,
                email: user.email,
                department: user.department,
                year: user.year,
                bio: user.bio,
                interests: user.interests,
                profileImage: user.profileImage,
                id: user._id,
            },
            stats: {
                joinedClubsCount: (user.joinedClubs || []).length,
                upcomingEventsCount: upcomingEvents.length,
                registeredEventsCount: (user.registeredEvents || []).length,
                points: user.points || 0,
            },
            upcomingEvents,
            registeredEvents: user.registeredEvents || [],
            joinedClubs: user.joinedClubs || [],
            recommendedClubs,
        });
    } catch (error) {
        console.error("❌ Dashboard error details:", error);
        res.status(500).json({
            error: "Server error fetching dashboard data",
            details: error.message
        });
    }
});

module.exports = router;
