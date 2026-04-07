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
        // PARALLELIZE: Fetch User, Upcoming Events, and all active clubs concurrently
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [user, upcomingEvents, allClubs] = await Promise.all([
          User.findById(req.user.userId)
            .select("fullName email department year bio interests profileImage globalRole points joinedClubs registeredEvents") // Omit resume from dashboard list
            .populate({ path: "joinedClubs", select: "name logo description category", strictPopulate: false, options: { limit: 10 } })
            .populate({ path: "registeredEvents", select: "title date club location", strictPopulate: false, options: { limit: 6 } })
            .lean(),
          
          Event.find({ date: { $gte: today } })
            .select("-participants -attendedParticipants")
            .populate("club", "name")
            .sort({ date: 1 })
            .limit(6)
            .lean(),

          Club.find({ isActive: true })
            .select('name logo description category')
            .limit(12) // Slightly more for better discovery
            .lean()
        ]);

        if (!user) {
            console.log("❌ User not found in DB");
            return res.status(404).json({ error: "User not found" });
        }

        console.log("👤 User found:", user.fullName);
        console.log("🗓️ Upcoming events found:", upcomingEvents.length);

        // Unified Membership & Authorization Lookup
        const [membership, userMemberships] = await Promise.all([
          ClubMember.findOne({
            userId: req.user.userId,
            $or: [
                { isLeader: true }, 
                { membershipType: "Core Member" },
                { roleId: { $ne: null } }
            ]
          }).populate("roleId").lean(),

          ClubMember.find({ userId: user._id })
            .populate("roleId")
            .lean()
        ]);

        const isClubLeader = !!membership;
        let membershipType = membership?.membershipType || "General Member";
        let clubId = membership?.clubId || null;
        
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

// GET /api/dashboard/results
router.get("/student-results", authenticate, async (req, res) => {
    try {
        // Find events where the student is either listed as a generic participant or attended participant
        const events = await Event.find({ 
            $or: [
                { participants: req.user.userId },
                { attendedParticipants: req.user.userId }
            ] 
        }).populate("club", "name").lean();
        
        const results = events.map(event => {
            const isWinner = event.results?.winners?.find(w => w.userId.toString() === req.user.userId.toString());
            return {
                id: event._id,
                title: event.title,
                club: event.club,
                date: event.date,
                published: event.results?.published || false,
                isWinner: !!isWinner,
                position: isWinner ? isWinner.position : null,
                isPast: event.isPast || new Date(event.date) < new Date(),
                // If the user attended, they get a participation cert or winner cert. 
                // If they registered but didn't attend, it depends on policy, but usually participation requires attendance.
                attended: (event.attendedParticipants || []).some(p => p.toString() === req.user.userId.toString())
            };
        });
        
        res.json(results);
    } catch (error) {
        console.error("Student results error:", error);
        res.status(500).json({ error: "Failed to fetch student results" });
    }
});

// GET /api/dashboard/certificate/:eventId
router.get("/certificate/:eventId", authenticate, async (req, res) => {
    try {
        const { eventId } = req.params;
        const user = await User.findById(req.user.userId);
        const event = await Event.findById(eventId).populate("club", "name logo");

        if (!event) return res.status(404).json({ error: "Event not found" });

        const hasAttended = (event.attendedParticipants || []).some(p => p.toString() === req.user.userId.toString());
        const hasParticipated = (event.participants || []).some(p => p.toString() === req.user.userId.toString());

        if (!hasAttended && !hasParticipated) {
            return res.status(403).json({ error: "Certificate not available. You did not participate in this event." });
        }

        const isWinner = event.results?.winners?.find(w => w.userId.toString() === req.user.userId.toString());
        const manualUrl = isWinner?.certificateUrl || null;

        res.json({
            userName: user.fullName,
            eventName: event.title,
            clubName: event.club?.name || "Banverse Club",
            clubLogo: event.club?.logo || null,
            date: event.date,
            type: isWinner ? "Winner" : "Participation",
            position: isWinner ? isWinner.position : null,
            manualUrl: manualUrl // To be handled by StudentDashboard
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch certificate metadata" });
    }
});

// GET /api/dashboard/moments
router.get("/moments", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('joinedClubs');
        const clubs = await Club.find({ _id: { $in: user.joinedClubs } }).select('name logo gallery');
        
        let allMoments = [];
        clubs.forEach(club => {
            // Optimization: Only show last 12 gallery items to keep payload manageable
            (club.gallery || []).slice(-12).forEach(item => {
                allMoments.push({
                    clubId: club._id,
                    clubName: club.name,
                    clubLogo: club.logo,
                    ...item.toObject()
                });
            });
        });
        
        // Sort by upload date descending
        allMoments.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        res.json(allMoments);
    } catch (error) {
        console.error("Moments error:", error);
        res.status(500).json({ error: "Failed to fetch moments" });
    }
});

// GET /api/dashboard/events/club/:clubId - Retrieve specific club events
router.get("/events/club/:clubId", authenticate, async (req, res) => {
    try {
        const events = await Event.find({ club: req.params.clubId })
            .select("title date description category location poster")
            .sort({ date: -1 });
        res.json(events);
    } catch (error) {
        console.error("Club events error:", error);
        res.status(500).json({ error: "Failed to fetch club events" });
    }
});

module.exports = router;
