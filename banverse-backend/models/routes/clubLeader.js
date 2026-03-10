const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../User");
const Club = require("../Club");
const Event = require("../Event");
const ClubMember = require("../ClubMember");
const ClubApplication = require("../ClubApplication");
const Notification = require("../Notification");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: verify user is leader of their club
// ─────────────────────────────────────────────────────────────────────────────
const verifyLeader = async (req, res, next) => {
    try {
        const membership = await ClubMember.findOne({
            userId: req.user.userId,
            isLeader: true
        });
        if (!membership) {
            // Also check legacy field
            const legacyClub = await Club.findOne({ leader: req.user.userId });
            if (legacyClub) {
                req.clubId = legacyClub._id;
                req.club = legacyClub;
                return next();
            }
            return res.status(403).json({ error: "Access denied. You are not a club leader." });
        }
        req.clubId = membership.clubId;
        next();
    } catch (error) {
        console.error("Leader verify error:", error);
        res.status(500).json({ error: "Server error during leader verification." });
    }
};

const leaderOnly = [authenticate, verifyLeader];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: get the leader's club, querying by both new and legacy field
// ─────────────────────────────────────────────────────────────────────────────
const getLeaderClub = async (userId) => {
    return await Club.findOne({
        $or: [
            { leaderId: userId },
            { leader: userId }
        ]
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/club-leader/my-club  - Get the leader's own club details
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-club", authenticate, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.json({ club: null });

        const memberCount = await ClubMember.countDocuments({ clubId: club._id });
        const coreCount = await ClubMember.countDocuments({ clubId: club._id, membershipType: "Core Member" });
        const generalCount = await ClubMember.countDocuments({ clubId: club._id, membershipType: "General Member" });
        const eventCount = await Event.countDocuments({ club: club._id });

        res.json({
            club,
            stats: {
                totalMembers: memberCount,
                coreMembers: coreCount,
                generalMembers: generalCount,
                totalEvents: eventCount
            }
        });
    } catch (error) {
        console.error("My club error:", error);
        res.status(500).json({ error: "Failed to fetch club" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/club-leader/dashboard  - Comprehensive Analytics (backward compat)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/dashboard", authenticate, async (req, res) => {
    try {
        let club = await getLeaderClub(req.user.userId);

        if (!club) {
            return res.json({ club: null });
        }

        // Also populate old-style members for backward compat
        club = await Club.findById(club._id)
            .populate({ path: "members.user", select: "fullName email createdAt profileImage", strictPopulate: false })
            .lean();

        const clubId = club._id;

        // New-style ClubMembers
        const allMembers = await ClubMember.find({ clubId })
            .populate("userId", "fullName email department year profileImage")
            .lean();

        const totalMembers = allMembers.length;
        const coreMembers = allMembers.filter(m => m.membershipType === "Core Member").length;
        const generalMembers = allMembers.filter(m => m.membershipType === "General Member").length;

        const events = await Event.find({ club: clubId })
            .populate({ path: "participants", select: "fullName email", strictPopulate: false })
            .populate({ path: "attendedParticipants", select: "fullName email", strictPopulate: false })
            .lean();

        const totalEvents = events.length;
        let totalRegistrations = 0;
        let totalAttendance = 0;
        const participationData = [];

        events.forEach(e => {
            const participants = e.participants || [];
            const attended = e.attendedParticipants || [];
            totalRegistrations += participants.length;
            totalAttendance += attended.length;
            participationData.push({
                name: (e.title || "Event").substring(0, 10),
                registered: participants.length,
                attended: attended.length
            });
        });

        const attendanceRate = totalRegistrations > 0
            ? Math.round((totalAttendance / totalRegistrations) * 100)
            : 0;

        const engagementScore = Math.min(100, Math.round(
            (totalMembers * 2) + (attendanceRate * 0.5) + (totalEvents * 5)
        ));

        // Domain distribution from ClubMembers
        const domainStats = {};
        allMembers.forEach(m => {
            const d = m.domain || "None";
            domainStats[d] = (domainStats[d] || 0) + 1;
        });

        const categoryBreakdown = Object.entries(domainStats).map(([name, value]) => ({ name, value }));

        const memberGrowth = [
            { month: "Sep", count: Math.max(0, totalMembers - 15) },
            { month: "Oct", count: Math.max(0, totalMembers - 12) },
            { month: "Nov", count: Math.max(0, totalMembers - 8) },
            { month: "Dec", count: Math.max(0, totalMembers - 5) },
            { month: "Jan", count: Math.max(0, totalMembers - 2) },
            { month: "Feb", count: totalMembers }
        ];

        res.json({
            club,
            members: allMembers,
            stats: {
                totalMembers,
                coreMembers,
                generalMembers,
                totalEvents,
                totalRegistrations,
                attendanceRate,
                engagementScore
            },
            charts: {
                memberGrowth,
                participationData,
                categoryBreakdown,
                attendancePie: [
                    { name: "Attended", value: totalAttendance },
                    { name: "Absent", value: Math.max(0, totalRegistrations - totalAttendance) }
                ]
            },
            events
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATIONS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/club-leader/applications  - Get all applications for leader's club
router.get("/applications", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        const applications = await ClubApplication.find({ clubId: club._id })
            .populate("userId", "fullName email department year profileImage")
            .sort("-createdAt");

        res.json(applications);
    } catch (error) {
        console.error("Applications error:", error);
        res.status(500).json({ error: "Failed to fetch applications" });
    }
});

// PUT /api/club-leader/applications/:appId/approve - Approve application
router.put("/applications/:appId/approve", leaderOnly, async (req, res) => {
    try {
        const { membershipType, domain } = req.body;

        const app = await ClubApplication.findById(req.params.appId)
            .populate("userId", "fullName email");

        if (!app) return res.status(404).json({ error: "Application not found" });
        if (app.status !== "pending") return res.status(400).json({ error: "Application already processed" });

        const club = await getLeaderClub(req.user.userId);
        if (!club || club._id.toString() !== app.clubId.toString()) {
            return res.status(403).json({ error: "Not authorized for this club" });
        }

        // Update application status
        app.status = "approved";
        app.assignedMembershipType = membershipType || "General Member";
        app.assignedDomain = domain || "";
        app.reviewedAt = new Date();
        await app.save();

        // Create ClubMember entry
        const existing = await ClubMember.findOne({ userId: app.userId._id, clubId: club._id });
        if (!existing) {
            await ClubMember.create({
                userId: app.userId._id,
                clubId: club._id,
                membershipType: membershipType || "General Member",
                role: membershipType === "Core Member" ? "core" : "member",
                domain: domain || "None",
                isLeader: false
            });
        }

        // Also add to legacy members array for backward compat
        const isAlreadyInLegacy = club.members.some(m => m.user?.toString() === app.userId._id.toString());
        if (!isAlreadyInLegacy) {
            club.members.push({
                user: app.userId._id,
                role: membershipType === "Core Member" ? "core" : "member",
                domain: domain || "General"
            });
            await club.save();
        }

        // Send notification to applicant
        await Notification.create({
            user: app.userId._id,
            message: `Your application to join ${club.name} has been approved! You are now a ${membershipType || "General Member"}.`,
            type: "application_approved"
        });

        res.json({ message: "Application approved", application: app });
    } catch (error) {
        console.error("Approve error:", error);
        res.status(500).json({ error: "Failed to approve application" });
    }
});

// PUT /api/club-leader/applications/:appId/reject - Reject application
router.put("/applications/:appId/reject", leaderOnly, async (req, res) => {
    try {
        const app = await ClubApplication.findById(req.params.appId);
        if (!app) return res.status(404).json({ error: "Application not found" });
        if (app.status !== "pending") return res.status(400).json({ error: "Application already processed" });

        const club = await getLeaderClub(req.user.userId);
        if (!club || club._id.toString() !== app.clubId.toString()) {
            return res.status(403).json({ error: "Not authorized for this club" });
        }

        app.status = "rejected";
        app.reviewedAt = new Date();
        await app.save();

        await Notification.create({
            user: app.userId,
            message: `Your application to join ${club.name} was not approved this time.`,
            type: "application_rejected"
        });

        res.json({ message: "Application rejected", application: app });
    } catch (error) {
        res.status(500).json({ error: "Failed to reject application" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/club-leader/domains - Get all domains for the club
router.get("/domains", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });
        res.json(club.domains || []);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch domains" });
    }
});

// POST /api/club-leader/domains - Add a new domain
router.post("/domains", leaderOnly, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: "Domain name is required" });

        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        // Check for duplicate
        const exists = club.domains.some(d => d.name.toLowerCase() === name.toLowerCase());
        if (exists) return res.status(400).json({ error: "Domain already exists" });

        club.domains.push({ name, description: description || "" });
        await club.save();

        res.status(201).json({ message: "Domain added", domains: club.domains });
    } catch (error) {
        res.status(500).json({ error: "Failed to add domain" });
    }
});

// PUT /api/club-leader/domains/:domainId - Edit a domain
router.put("/domains/:domainId", leaderOnly, async (req, res) => {
    try {
        const { name, description } = req.body;
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        const domain = club.domains.id(req.params.domainId);
        if (!domain) return res.status(404).json({ error: "Domain not found" });

        if (name) domain.name = name;
        if (description !== undefined) domain.description = description;
        await club.save();

        res.json({ message: "Domain updated", domains: club.domains });
    } catch (error) {
        res.status(500).json({ error: "Failed to update domain" });
    }
});

// DELETE /api/club-leader/domains/:domainId - Delete a domain
router.delete("/domains/:domainId", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        club.domains = club.domains.filter(d => d._id.toString() !== req.params.domainId);
        await club.save();

        res.json({ message: "Domain deleted", domains: club.domains });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete domain" });
    }
});

// GET /api/club-leader/domains/:domainId/members - Members in a specific domain
router.get("/domains/:domainId/members", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        const domain = club.domains.id(req.params.domainId);
        if (!domain) return res.status(404).json({ error: "Domain not found" });

        const members = await ClubMember.find({
            clubId: club._id,
            domain: domain.name
        }).populate("userId", "fullName email department year profileImage");

        res.json({ domain, members });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch domain members" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/club-leader/members - Get all club members
router.get("/members", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        const { membershipType, domain, search } = req.query;
        let filter = { clubId: club._id };
        if (membershipType) filter.membershipType = membershipType;
        if (domain) filter.domain = domain;

        let members = await ClubMember.find(filter)
            .populate("userId", "fullName email department year profileImage")
            .sort("-joinedAt");

        if (search) {
            const s = search.toLowerCase();
            members = members.filter(m =>
                m.userId?.fullName?.toLowerCase().includes(s) ||
                m.userId?.email?.toLowerCase().includes(s)
            );
        }

        res.json(members);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch members" });
    }
});

// PUT /api/club-leader/members/:memberId/promote - Promote General → Core
router.put("/members/:memberId/promote", leaderOnly, async (req, res) => {
    try {
        const { membershipType, domain } = req.body;
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        const member = await ClubMember.findOne({
            _id: req.params.memberId,
            clubId: club._id
        });

        if (!member) return res.status(404).json({ error: "Member not found" });
        if (member.isLeader) return res.status(400).json({ error: "Cannot change leader's role" });

        if (membershipType) {
            member.membershipType = membershipType;
            member.role = membershipType === "Core Member" ? "core" : "member";
        }
        if (domain) member.domain = domain;
        await member.save();

        res.json({ message: "Member updated successfully", member });
    } catch (error) {
        res.status(500).json({ error: "Promotion failed" });
    }
});

// DELETE /api/club-leader/members/:memberId - Remove a member
router.delete("/members/:memberId", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        const member = await ClubMember.findOne({
            _id: req.params.memberId,
            clubId: club._id
        });

        if (!member) return res.status(404).json({ error: "Member not found" });
        if (member.isLeader) return res.status(400).json({ error: "Cannot remove club leader" });

        await ClubMember.deleteOne({ _id: req.params.memberId });

        // Remove from legacy members array too
        club.members = club.members.filter(m => m.user?.toString() !== member.userId.toString());
        await club.save();

        res.json({ message: "Member removed successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to remove member" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/club-leader/events - Get all events for leader's club
router.get("/events", authenticate, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.json([]);

        const events = await Event.find({ club: club._id })
            .populate("participants", "fullName email")
            .sort("-date");

        res.json(events);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch events" });
    }
});

// POST /api/club-leader/create-event
router.post("/create-event", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        if (!club) {
            return res.status(400).json({ error: "Please set up your club profile before creating an event." });
        }

        const newEvent = new Event({
            ...req.body,
            creator: req.user.userId,
            club: club._id
        });

        await newEvent.save();
        res.status(201).json({ message: "Event created successfully", event: newEvent });
    } catch (error) {
        console.error("Create Event Error:", error);
        res.status(500).json({ error: "Failed to create event. Make sure all fields are correct." });
    }
});

// PUT /api/club-leader/edit-event/:id
router.put("/edit-event/:id", leaderOnly, async (req, res) => {
    try {
        const event = await Event.findOneAndUpdate(
            { _id: req.params.id, creator: req.user.userId },
            req.body,
            { new: true }
        );
        res.json({ message: "Event updated", event });
    } catch (error) {
        res.status(500).json({ error: "Failed to update event" });
    }
});

// DELETE /api/club-leader/delete-event/:id
router.delete("/delete-event/:id", leaderOnly, async (req, res) => {
    try {
        await Event.findOneAndDelete({ _id: req.params.id, creator: req.user.userId });
        res.json({ message: "Event deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Deletion failed" });
    }
});

// POST /api/club-leader/mark-attendance
router.post("/mark-attendance/:eventId", leaderOnly, async (req, res) => {
    try {
        const { attendedUserIds } = req.body;
        const event = await Event.findByIdAndUpdate(
            req.params.eventId,
            {
                attendedParticipants: attendedUserIds,
                attendanceMarked: true
            },
            { new: true }
        );
        res.json({ message: "Attendance marked successfully", event });
    } catch (error) {
        res.status(500).json({ error: "Failed to mark attendance" });
    }
});

// POST /api/club-leader/notify
router.post("/notify", leaderOnly, async (req, res) => {
    try {
        const { message, target } = req.body;
        const club = await getLeaderClub(req.user.userId);

        let userIds = [];
        if (target === "members") {
            const members = await ClubMember.find({ clubId: club._id });
            userIds = members.map(m => m.userId);
        } else if (Array.isArray(target)) {
            userIds = target;
        }

        const notifications = userIds.map(uid => ({
            user: uid,
            message: `[${club.name}] ${message}`,
            type: "announcement"
        }));

        await Notification.insertMany(notifications);
        res.json({ message: "Notifications sent successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to send notifications" });
    }
});

// PUT /api/club-leader/update-profile
router.put("/update-profile", leaderOnly, async (req, res) => {
    try {
        const { name, description, vision, category, logo, email, phone, instagram, linkedin } = req.body;
        const club = await Club.findOneAndUpdate(
            { $or: [{ leaderId: req.user.userId }, { leader: req.user.userId }] },
            { name, description, vision, category, logo, email, phone, instagram, linkedin },
            { new: true, upsert: false }
        );
        if (!club) return res.status(404).json({ error: "Club not found" });
        res.json({ message: "Club profile updated successfully", club });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ error: "Failed to update club profile" });
    }
});

// GET /api/club-leader/export
router.get("/export", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId);
        const members = await ClubMember.find({ clubId: club._id })
            .populate("userId", "fullName email department year");

        let csv = "Full Name,Email,Membership Type,Domain,Joined At\n";
        members.forEach(m => {
            const u = m.userId;
            if (u) {
                csv += `${u.fullName},${u.email},${m.membershipType},${m.domain},${new Date(m.joinedAt).toLocaleDateString()}\n`;
            }
        });
        res.header("Content-Type", "text/csv");
        res.attachment(`${club.name}_members_report.csv`);
        return res.send(csv);
    } catch (error) {
        res.status(500).json({ error: "Export failed" });
    }
});

module.exports = router;
