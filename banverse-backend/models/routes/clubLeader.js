const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../User");
const Club = require("../Club");
const Event = require("../Event");
const ClubMember = require("../ClubMember");
const ClubApplication = require("../ClubApplication");
const Notification = require("../Notification");
const ClubRole = require("../ClubRole");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: verify user is leader or core member of their club
const verifyLeader = async (req, res, next) => {
    try {
        // Check for dedicated ClubMember model (supports both leaders and core members)
        const membership = await ClubMember.findOne({
            userId: req.user.userId,
            clubId: req.params.clubId || req.query.clubId || null // Some routes use it
        });
        
        // If no specific clubId in URL, find the first relevant membership
        let finalMembership = membership;
        if (!finalMembership) {
            finalMembership = await ClubMember.findOne({
                userId: req.user.userId,
                $or: [{ isLeader: true }, { membershipType: "Core Member" }, { roleId: { $ne: null } }]
            }).populate("roleId");
        } else {
            await finalMembership.populate("roleId");
        }

        if (!finalMembership) {
            // Also check legacy field
            const legacyClub = await Club.findOne({ leader: req.user.userId });
            if (legacyClub) {
                req.clubId = legacyClub._id;
                req.club = legacyClub;
                req.userClubPermissions = {
                    canCreateEvents: true, canEditEvents: true, canSendNotifications: true,
                    canManageMembers: true, canEditClubProfile: true, canUploadPhotos: true, canViewAnalytics: true
                };
                return next();
            }
            return res.status(403).json({ error: "Access denied. You are not a club leader or core member." });
        }
        
        req.clubId = finalMembership.clubId;
        
        // Populate permissions for the route to check
        req.userClubPermissions = finalMembership.isLeader ? {
            canCreateEvents: true, canEditEvents: true, canSendNotifications: true,
            canManageMembers: true, canEditClubProfile: true, canUploadPhotos: true, 
            canViewAnalytics: true, canManageResults: true
        } : (finalMembership.roleId?.permissions || {
            canCreateEvents: false, canEditEvents: false, canSendNotifications: false,
            canManageMembers: false, canEditClubProfile: false, canUploadPhotos: false, 
            canViewAnalytics: false, canManageResults: false
        });

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
const getLeaderClub = async (userId, requestedClubId = null) => {
    if (requestedClubId) {
        const club = await Club.findById(requestedClubId);
        if (club && (club.leaderId?.toString() === userId.toString() || club.leader?.toString() === userId.toString())) {
            return club;
        }
        const membership = await ClubMember.findOne({ userId, clubId: requestedClubId });
        if (membership) return await Club.findById(requestedClubId);
        return null; // Return null if not a member of the requested club
    }

    const club = await Club.findOne({
        $or: [
            { leaderId: userId },
            { leader: userId }
        ]
    });
    
    if (club) return club;
    
    // If not direct leader, check memberships
    const membership = await ClubMember.findOne({
        userId,
        $or: [
           { membershipType: "Core Member" },
           { roleId: { $ne: null } }
        ]
    });
    
    if (membership) {
        return await Club.findById(membership.clubId);
    }
    
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/club-leader/my-club  - Get the leader's own club details
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-club", authenticate, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId);
        if (!club) return res.json({ club: null });

        const memberCount = await ClubMember.countDocuments({ clubId: club._id });
        const coreCount = await ClubMember.countDocuments({ clubId: club._id, membershipType: "Core Member" });
        const generalCount = await ClubMember.countDocuments({ clubId: club._id, membershipType: "General Member" });
        const eventCount = await Event.countDocuments({ club: club._id });

        // Calculate the current user's specific permissions in this club context
        const userMembership = await ClubMember.findOne({ userId: req.user.userId, clubId: club._id })
            .populate("roleId");
            
        const isLeader = userMembership?.isLeader || club.leaderId?.toString() === req.user.userId.toString() || club.leader?.toString() === req.user.userId.toString();
        
        const permissions = isLeader ? {
            canCreateEvents: true,
            canEditEvents: true,
            canSendNotifications: true,
            canManageMembers: true,
            canEditClubProfile: true,
            canUploadPhotos: true,
            canViewAnalytics: true
        } : (userMembership?.roleId?.permissions || {
            canCreateEvents: false,
            canEditEvents: false,
            canSendNotifications: false,
            canManageMembers: false,
            canEditClubProfile: false,
            canUploadPhotos: false,
            canViewAnalytics: false
        });

        res.json({
            club,
            permissions,
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
        let club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId);

        if (!club) {
            return res.json({ club: null });
        }

        // Populate leader for backward compat/security but drop huge user lists
        club = await Club.findById(club._id)
            .populate("leaderId", "fullName email profileImage")
            .populate("leader", "fullName email profileImage")
            .select("-members")
            .lean();

        const clubId = club._id;

        // New-style ClubMembers
        const allMembers = await ClubMember.find({ clubId })
            .select("membershipType isLeader customTitle domain roleId")
            .populate("roleId", "roleName permissions")
            .lean();

        const totalMembers = allMembers.length;
        const coreMembers = allMembers.filter(m => m.membershipType === "Core Member").length;
        const generalMembers = allMembers.filter(m => m.membershipType === "General Member").length;

        // We no longer send full members and full events arrays in the dashboard overview
        // to save memory and improve speed. The specific tabs fetch them separately.
        
        // Count registrations and attendance without loading all participant details
        // Fast query across ALL events to build analytical charts (No giant base64 payloads)
        const allEventsForStats = await Event.find({ club: clubId })
            .select('title date participants attendedParticipants')
            .lean();
            
        // Detailed query for the UI, limited to most recent entries
        const detailedEvents = await Event.find({ club: clubId })
            .sort({ date: -1 })
            .limit(50)
            .populate("participants", "fullName email")
            .lean();
        
        const totalEvents = allEventsForStats.length;
        let totalRegistrations = 0;
        let totalAttendance = 0;
        const participationData = [];

        allEventsForStats.forEach(e => {
            const participantsCount = e.participants?.length || 0;
            const attendedCount = e.attendedParticipants?.length || 0;
            totalRegistrations += participantsCount;
            totalAttendance += attendedCount;
            participationData.push({
                name: (e.title || "Event").length > 20 ? (e.title || "Event").substring(0, 20) + "..." : (e.title || "Event"),
                registered: participantsCount,
                attended: attendedCount
            });
        });

        const attendanceRate = totalRegistrations > 0
            ? Math.round((totalAttendance / totalRegistrations) * 100)
            : 0;

        const engagementScore = Math.min(100, Math.round(
            (totalMembers * 2) + (attendanceRate * 0.5) + (totalEvents * 5)
        ));

        // ... existing permissions logic ...
        const userMembership = await ClubMember.findOne({ userId: req.user.userId, clubId })
            .populate("roleId");
            
        const isLeader = userMembership?.isLeader || club.leaderId?._id?.toString() === req.user.userId.toString() || club.leader?._id?.toString() === req.user.userId.toString();
        
        const permissions = isLeader ? {
            canCreateEvents: true, 
            canEditEvents: true,
            canSendNotifications: true,
            canManageMembers: true,
            canEditClubProfile: true,
            canUploadPhotos: true,
            canViewAnalytics: true
        } : (userMembership?.roleId?.permissions || {
            canCreateEvents: false,
            canEditEvents: false,
            canSendNotifications: false,
            canManageMembers: false,
            canEditClubProfile: false,
            canUploadPhotos: false,
            canViewAnalytics: false
        });

        // Domain distribution
        const domainStats = {};
        allMembers.forEach(m => {
            const d = m.roleId?.roleName || m.customTitle || (m.domain && m.domain !== "None" ? m.domain : "General");
            domainStats[d] = (domainStats[d] || 0) + 1;
        });

        const categoryBreakdown = Object.entries(domainStats).map(([name, value]) => ({ name, value }));

        const memberGrowth = [
            { month: "Jan", count: Math.max(0, Math.floor(totalMembers * 0.2)) },
            { month: "Feb", count: Math.max(1, Math.floor(totalMembers * 0.6)) },
            { month: "Mar", count: Math.max(1, Math.floor(totalMembers * 0.9)) },
            { month: "Apr", count: totalMembers }
        ];

        res.json({
            club,
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
            permissions,
            events: detailedEvents
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
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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

        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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

        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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

        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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
// ROLE MANAGEMENT (DYNAMIC TEAMS)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/club-leader/roles
router.get("/roles", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
        const roles = await ClubRole.find({ clubId: club._id }).sort('tierLevel');
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch roles" });
    }
});

// POST /api/club-leader/roles
router.post("/roles", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
        const roleData = { ...req.body, clubId: club._id };
        const newRole = await ClubRole.create(roleData);
        res.status(201).json(newRole);
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Role name already exists" });
        res.status(500).json({ error: "Failed to create role" });
    }
});

// PUT /api/club-leader/roles/:roleId
router.put("/roles/:roleId", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
        const role = await ClubRole.findOneAndUpdate(
            { _id: req.params.roleId, clubId: club._id },
            req.body,
            { new: true }
        );
        if (!role) return res.status(404).json({ error: "Role not found" });
        res.json(role);
    } catch (error) {
        res.status(500).json({ error: "Failed to update role" });
    }
});

// DELETE /api/club-leader/roles/:roleId
router.delete("/roles/:roleId", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
        const role = await ClubRole.findOneAndDelete({ _id: req.params.roleId, clubId: club._id });
        if (!role) return res.status(404).json({ error: "Role not found" });

        // Wipe this role from any assigned members (demote them to general participants)
        await ClubMember.updateMany({ roleId: role._id }, { $unset: { roleId: 1 } });
        res.json({ message: "Role deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete role" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/club-leader/members - Get all club members
router.get("/members", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        const { membershipType, domain, search } = req.query;
        let filter = { clubId: club._id };
        if (membershipType) filter.membershipType = membershipType;
        if (domain) filter.domain = domain;

        let members = await ClubMember.find(filter)
            .populate("userId", "fullName email department year") // Exclude heavy profileImage from list
            .populate("roleId")
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

// PUT /api/club-leader/members/:memberId/promote - Assign a Dynamic Role
router.put("/members/:memberId/promote", leaderOnly, async (req, res) => {
    try {
        const { roleId, membershipType, domain, customTitle } = req.body;
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        const member = await ClubMember.findOne({
            _id: req.params.memberId,
            clubId: club._id
        });

        if (!member) return res.status(404).json({ error: "Member not found" });
        if (member.isLeader) return res.status(400).json({ error: "Cannot change leader's role" });

        if (roleId !== undefined) member.roleId = roleId || null; // Null drops them from structured team
        
        // If a student is being assigned to a specific team or given a custom title,
        // they should automatically be upgraded to a "Core Member" so they can access the dashboard.
        if (roleId || customTitle) {
            member.membershipType = "Core Member";
            member.role = "core";
        }

        // Legacy support updates (if explicitly requested)
        if (membershipType) {
            member.membershipType = membershipType;
            member.role = membershipType === "Core Member" ? "core" : "member";
        }
        if (domain) member.domain = domain;
        if (customTitle !== undefined) member.customTitle = customTitle;

        await member.save();

        // Send Notification to user about role change
        try {
            const roleObj = roleId ? await ClubRole.findById(roleId) : null;
            const roleName = customTitle || (roleObj ? roleObj.roleName : (membershipType || "Member"));
            await Notification.create({
                userId: member.userId,
                message: `You've been assigned to the ${roleName} in ${club.name}! Check your Club Dashboard.`
            });
        } catch (notifErr) {
            console.error("Failed to send role update notification:", notifErr);
        }

        res.json({ message: "Member promoted to role successfully", member });
    } catch (error) {
        res.status(500).json({ error: "Promotion failed" });
    }
});

// DELETE /api/club-leader/members/:memberId - Remove a member
router.delete("/members/:memberId", leaderOnly, async (req, res) => {
    try {
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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
        if (!req.clubId) {
            return res.status(400).json({ error: "No club relationship found for this profile." });
        }

        if (!req.userClubPermissions.canCreateEvents) {
            return res.status(403).json({ error: "permission-denied: You do not have authority to create events." });
        }

        const newEvent = new Event({
            ...req.body,
            creator: req.user.userId,
            club: req.clubId
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
        if (!req.userClubPermissions.canEditEvents) {
            return res.status(403).json({ error: "permission-denied: You do not have authority to edit events." });
        }

        const event = await Event.findOneAndUpdate(
            { _id: req.params.id, club: req.clubId },
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
        if (!req.userClubPermissions.canEditEvents) {
            return res.status(403).json({ error: "permission-denied: You do not have authority to delete events." });
        }

        const deletedEvent = await Event.findOneAndDelete({ 
            _id: req.params.id, 
            club: req.clubId 
        });

        if (!deletedEvent) {
            return res.status(404).json({ error: "Event not found or doesn't belong to your club." });
        }

        res.json({ message: "Event deleted successfully" });
    } catch (error) {
        console.error("Delete Event Error:", error);
        res.status(500).json({ error: "Deletion failed", details: error.message });
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
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);

        if (!req.userClubPermissions.canSendNotifications) {
            return res.status(403).json({ error: "permission-denied: Your role does not allow broadcasting announcements." });
        }

        let userIds = [];
        if (target === "members" || target === "all") {
            // Broadcast to absolutely every student on the platform as requested
            const User = require("../User");
            const allUsers = await User.find({ globalRole: 'student' }).select('_id');
            userIds = allUsers.map(u => u._id);
        } else if (Array.isArray(target)) {
            userIds = target;
        }

        const notifications = userIds.map(uid => ({
            userId: uid,
            message: `[${club.name}] ${message}`
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
        const { name, description, vision, category, logo, banner, email, phone, instagram, linkedin } = req.body;
        const club = await Club.findOneAndUpdate(
            { $or: [{ leaderId: req.user.userId }, { leader: req.user.userId }] },
            { name, description, vision, category, logo, banner, email, phone, instagram, linkedin },
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
        const club = await getLeaderClub(req.user.userId, req.query.clubId || req.clubId || req.body.clubId);
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

// POST /api/club-leader/gallery/upload
router.post("/gallery/upload", leaderOnly, async (req, res) => {
    try {
        const { image, caption } = req.body;
        if (!image) return res.status(400).json({ error: "Image is required" });

        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        if (!req.userClubPermissions.canUploadPhotos) {
            return res.status(403).json({ error: "permission-denied: You do not have authority to upload gallery photos." });
        }

        // Identify the uploader's role/team
        const membership = await ClubMember.findOne({ userId: req.user.userId, clubId: club._id })
            .populate("roleId");

        let teamLabel = "Club Member"; 
        if (membership.isLeader) teamLabel = "Club Leader";
        else if (membership.roleId) teamLabel = membership.roleId.roleName;

        club.gallery.push({
            url: image, // Base64 for now as per this app's pattern
            caption: caption || "",
            uploadedBy: req.user.userId,
            category: teamLabel
        });

        await club.save();
        res.json({ message: "Photo added to gallery", gallery: club.gallery });
    } catch (error) {
        console.error("Gallery upload error:", error);
        res.status(500).json({ error: "Failed to upload photo" });
    }
});

// DELETE /api/club-leader/gallery/photo/:photoId
router.delete("/gallery/photo/:photoId", leaderOnly, async (req, res) => {
    try {
        const { photoId } = req.params;
        const club = await getLeaderClub(req.user.userId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        if (!req.userClubPermissions.canUploadPhotos) {
            return res.status(403).json({ error: "permission-denied: You do not have authority to manage gallery moments." });
        }

        club.gallery = club.gallery.filter(p => p._id.toString() !== photoId);
        await club.save();
        res.json({ message: "Photo removed from gallery", gallery: club.gallery });
    } catch (error) {
        console.error("Gallery delete error:", error);
        res.status(500).json({ error: "Failed to delete photo" });
    }
});

// POST /api/club-leader/events/:eventId/results
router.post("/events/:eventId/results", leaderOnly, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { winners } = req.body; // Expected format: [{ userId, position }]

        if (!req.userClubPermissions.canManageResults) {
            return res.status(403).json({ error: "Access denied. You do not have permission to manage results." });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: "Event not found" });

        // Simple validation: make sure positional winners exist
        if (!winners || !Array.isArray(winners)) {
            return res.status(400).json({ error: "Winners list is required." });
        }

        event.results = {
            published: true,
            winners: winners.map(w => ({
                userId: w.userId,
                position: w.position,
                certificateUrl: w.certificateUrl || null // CRITICAL: Save the uploaded certificate!
            }))
        };

        await event.save();
        res.json({ message: "Results published successfully", results: event.results });
    } catch (error) {
        console.error("Results publish error:", error);
        res.status(500).json({ error: "Failed to publish results" });
    }
});

module.exports = router;
