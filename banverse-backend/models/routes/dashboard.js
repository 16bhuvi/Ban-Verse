const express = require("express");
const router = express.Router();
const User = require("../User");
const Event = require("../Event");
const Club = require("../Club");
const ClubMember = require("../ClubMember");
const ClubRole = require("../ClubRole");
const { authenticate } = require("../../middleware/authMiddleware");

// GET /api/dashboard/public-stats
router.get("/public-stats", async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ globalRole: "student" });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthlyEvents = await Event.countDocuments({ date: { $gte: thirtyDaysAgo } });
        
        const activeClubs = await Club.countDocuments({ isActive: true });

        res.json({
            students: totalUsers,
            eventsMonthly: monthlyEvents,
            activeClubs: activeClubs
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

        // Unified Membership & Authorization Lookup for the student's main club access
        const membership = await ClubMember.findOne({
            userId: req.user.userId,
            $or: [
                { isLeader: true }, 
                { membershipType: "Core Member" },
                { roleId: { $ne: null } }
            ]
        }).populate("roleId").lean();

        const isClubLeader = !!membership;
        let membershipType = membership?.membershipType || "General Member";
        let clubId = membership?.clubId || null;

        // OPTIMIZATION: Prefetch ALL of the user's club memberships to avoid N+1 queries in the enrichment loop
        const userMemberships = await ClubMember.find({ userId: user._id })
            .populate("roleId")
            .lean();
        
        // Create a fast lookup map: clubId string -> membership object
        const membershipsMap = new Map();
        userMemberships.forEach(m => {
            membershipsMap.set(m.clubId?.toString(), m);
        });

        // Enrich joinedClubs with the specific member's title/role for each club
        console.log("💎 Fast-Enriching", (user.joinedClubs || []).length, "joined clubs...");
        const finalEnrichedClubs = (user.joinedClubs || []).filter(c => c !== null).map((club) => {
            if (!club || !club._id) return null;
            
            const m = membershipsMap.get(club._id.toString());
            let displayRole = "Member";
            if (m) {
                if (m.customTitle) displayRole = m.customTitle;
                else if (m.roleId) displayRole = m.roleId.roleName;
                else displayRole = m.membershipType || "Member";
            }
            
            return {
                ...club,
                memberRole: displayRole
            };
        }).filter(c => c !== null);

        console.log("✅ Optimized dashboard prepared for", user.fullName);

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
                resume: user.resume, 
                globalRole: user.globalRole,
                isClubLeader,
                membershipType,
                clubId,
                permissions: membership?.isLeader ? {
                    canCreateEvents: true,
                    canEditEvents: true,
                    canSendNotifications: true,
                    canManageMembers: true,
                    canEditClubProfile: true,
                    canUploadPhotos: true,
                    canViewAnalytics: true
                } : (membership?.roleId?.permissions || {
                   canCreateEvents: false,
                   canEditEvents: false,
                   canSendNotifications: false,
                   canManageMembers: false,
                   canEditClubProfile: false,
                   canUploadPhotos: false,
                   canViewAnalytics: false
                })
            },
            stats: {
                joinedClubsCount: finalEnrichedClubs.length,
                upcomingEventsCount: upcomingEvents.length,
                registeredEventsCount: (user.registeredEvents || []).length,
                points: user.points || 0,
            },
            upcomingEvents,
            registeredEvents: user.registeredEvents || [],
            joinedClubs: finalEnrichedClubs,
            allClubs, 
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
