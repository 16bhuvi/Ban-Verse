const express = require("express");
const router = express.Router();
const User = require("../User");
const Event = require("../Event");
const Club = require("../Club");
const { authenticate } = require("../../middleware/authMiddleware");

// GET /api/dashboard/public-stats
router.get("/public-stats", async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ globalRole: "student" });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthlyEvents = await Event.countDocuments({ date: { $gte: thirtyDaysAgo } });
        
        const departments = await User.distinct("department");
        const validDepartments = departments.filter(d => d && d.trim() !== "");

        res.json({
            students: totalUsers,
            eventsMonthly: monthlyEvents,
            departments: validDepartments.length
        });
    } catch (error) {
        console.error("❌ Public stats error details:", error);
        res.status(500).json({ error: "Server error fetching public stats" });
    }
});

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

        // Get upcoming events (from beginning of today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingEvents = await Event.find({
            date: { $gte: today }
        })
            .populate("club", "name logo")
            .sort({ date: 1 })
            .lean();

        console.log("🗓️ Upcoming events found:", upcomingEvents.length);

        // Get all clubs for exploration
        const allClubs = await Club.find({ isActive: true }).lean();

        res.json({
            user: {
                _id: user._id,
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                department: user.department,
                year: user.year,
                bio: user.bio,
                interests: user.interests,
                profileImage: user.profileImage,
                resume: user.resume, // CRITICAL FIX: Include resume
                globalRole: user.globalRole,
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
            allClubs, // Corrected from recommendedClubs to allClubs
        });
    } catch (error) {
        console.error("❌ Dashboard error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Added to support ViewClub.jsx clustering
router.get("/events/club/:clubId", authenticate, async (req, res) => {
    try {
        const events = await Event.find({ club: req.params.clubId }).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch club events" });
    }
});

module.exports = router;
