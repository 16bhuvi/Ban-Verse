const express = require("express");
const router = express.Router();
const User = require("../User");
const Club = require("../Club");
const Event = require("../Event");
const ClubMember = require("../ClubMember");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

// Middleware to ensure only admin can access
const adminOnly = [authenticate, authorize("admin")];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics  (also aliased as /dashboard)
// Returns comprehensive stats for Admin Dashboard Overview
// ─────────────────────────────────────────────────────────────────────────────
router.get(["/dashboard", "/analytics"], adminOnly, async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ globalRole: "student" });
        const totalClubs = await Club.countDocuments({ isActive: true });
        const totalEvents = await Event.countDocuments();
        const totalMembers = await ClubMember.countDocuments();

        // Monthly student registrations (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const userGrowth = await User.aggregate([
            { $match: { globalRole: "student", createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Events per club (Bar Chart)
        const eventsPerClub = await Event.aggregate([
            { $group: { _id: "$club", count: { $sum: 1 } } },
            {
                $lookup: {
                    from: "clubs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "clubInfo"
                }
            },
            { $unwind: { path: "$clubInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: { $ifNull: ["$clubInfo.name", "Unknown"] },
                    count: 1
                }
            }
        ]);

        // Member distribution per club (Pie Chart)
        const memberDistribution = await ClubMember.aggregate([
            { $group: { _id: "$clubId", count: { $sum: 1 } } },
            {
                $lookup: {
                    from: "clubs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "clubInfo"
                }
            },
            { $unwind: { path: "$clubInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: { $ifNull: ["$clubInfo.name", "Unknown"] },
                    value: "$count"
                }
            }
        ]);

        // Events by category (backward compat)
        const eventsByCategory = await Event.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        res.json({
            stats: {
                totalStudents,
                totalClubs,
                totalEvents,
                totalMembers,
                totalRegistrations: totalMembers
            },
            userGrowth,
            eventsPerClub,
            memberDistribution,
            eventsByCategory
        });
    } catch (error) {
        console.error("Admin analytics error:", error);
        res.status(500).json({ error: "Admin dashboard stats failed" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users  - Get all users (for dropdown + table)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/users", adminOnly, async (req, res) => {
    try {
        const users = await User.find({ globalRole: "student" }).select("-password").sort("-createdAt");
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/clubs  - Get all clubs
// ─────────────────────────────────────────────────────────────────────────────
router.get("/clubs", adminOnly, async (req, res) => {
    try {
        const clubs = await Club.find()
            .populate("leaderId", "fullName email profileImage")
            .populate("leader", "fullName email profileImage")
            .sort("-createdAt");
        res.json(clubs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch clubs" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/clubs  - Create a new club (OFFLINE APPROVAL MODEL)
// Admin creates club, assigns leader, leader automatically becomes Core Member
// ─────────────────────────────────────────────────────────────────────────────
router.post("/clubs", adminOnly, async (req, res) => {
    try {
        const {
            name,
            description,
            vision,
            membershipTypes,
            domains,
            leaderId,
            category
        } = req.body;

        if (!name || !description || !leaderId) {
            return res.status(400).json({ error: "Name, description, and leader are required." });
        }

        // Verify leader exists
        const leader = await User.findById(leaderId);
        if (!leader) {
            return res.status(404).json({ error: "Selected leader not found." });
        }
        if (leader.globalRole !== "student") {
            return res.status(400).json({ error: "Leader must be a student user." });
        }

        // Format domains
        const formattedDomains = (domains || []).map(d => ({
            name: typeof d === "string" ? d : d.name,
            description: typeof d === "string" ? "" : (d.description || "")
        }));

        // Create the club
        const club = new Club({
            name,
            description,
            vision: vision || "",
            category: category || "Technical",
            leaderId,
            leader: leaderId,  // backward compat
            membershipTypes: membershipTypes || ["Core Member", "General Member"],
            domains: formattedDomains,
            approved: true,
            isActive: true
        });

        await club.save();

        // Mark leader as Club Leader in User doc
        await User.findByIdAndUpdate(leaderId, { isClubLeader: true });

        // Create ClubMember entry for the leader
        const existingMembership = await ClubMember.findOne({ userId: leaderId, clubId: club._id });
        if (!existingMembership) {
            await ClubMember.create({
                userId: leaderId,
                clubId: club._id,
                membershipType: "Core Member",
                role: "leader",
                isLeader: true,
                domain: formattedDomains[0]?.name || "None"
            });
        }

        // Also add to club.members array for backward compat
        club.members.push({
            user: leaderId,
            role: "leader",
            domain: formattedDomains[0]?.name || "General"
        });
        await club.save();

        const populatedClub = await Club.findById(club._id).populate("leaderId", "fullName email");
        res.status(201).json({ message: "Club created successfully", club: populatedClub });
    } catch (error) {
        console.error("Club creation error:", error);
        if (error.code === 11000) {
            return res.status(400).json({ error: "A club with this name already exists." });
        }
        res.status(500).json({ error: "Failed to create club" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/clubs/:id/deactivate  - Deactivate a club
// ─────────────────────────────────────────────────────────────────────────────
router.put("/clubs/:id/deactivate", adminOnly, async (req, res) => {
    try {
        const club = await Club.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        if (!club) return res.status(404).json({ error: "Club not found" });
        res.json({ message: "Club deactivated", club });
    } catch (error) {
        res.status(500).json({ error: "Failed to deactivate club" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/clubs/:id/activate  - Reactivate a club
// ─────────────────────────────────────────────────────────────────────────────
router.put("/clubs/:id/activate", adminOnly, async (req, res) => {
    try {
        const club = await Club.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        );
        if (!club) return res.status(404).json({ error: "Club not found" });
        res.json({ message: "Club activated", club });
    } catch (error) {
        res.status(500).json({ error: "Failed to activate club" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/all  - Get all users including admin (platform overview)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/users/all", adminOnly, async (req, res) => {
    try {
        const users = await User.find().select("-password").sort("-createdAt");
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/promote/:id  - Promote a student to Club Leader flag
// ─────────────────────────────────────────────────────────────────────────────
router.put("/promote/:id", adminOnly, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isClubLeader: true },
            { new: true }
        ).select("-password");
        res.json({ message: "User promoted to Club Leader", user });
    } catch (error) {
        res.status(500).json({ error: "Promotion failed" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/announcement  - Send Global Announcement
// ─────────────────────────────────────────────────────────────────────────────
router.post("/announcement", adminOnly, async (req, res) => {
    try {
        const { message } = req.body;
        const Notification = require("../Notification");
        const users = await User.find({ globalRole: "student" });

        const notifications = users.map(user => ({
            user: user._id,
            message,
            type: "announcement"
        }));

        await Notification.insertMany(notifications);
        res.json({ message: "Global announcement sent successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to send announcement" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/export  - Export Users CSV
// ─────────────────────────────────────────────────────────────────────────────
router.get("/export", adminOnly, async (req, res) => {
    try {
        const users = await User.find().select("fullName email globalRole department year points isClubLeader");
        let csv = "Full Name,Email,Role,Department,Year,Points,Is Club Leader\n";
        users.forEach(u => {
            csv += `${u.fullName},${u.email},${u.globalRole},${u.department || ""},${u.year || ""},${u.points},${u.isClubLeader}\n`;
        });
        res.header("Content-Type", "text/csv");
        res.attachment("users_report.csv");
        return res.send(csv);
    } catch (error) {
        res.status(500).json({ error: "Export failed" });
    }
});

module.exports = router;
