const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../User");
const Club = require("../Club");
const Event = require("../Event");
const ClubMember = require("../ClubMember");
const EventMember = require("../EventMember");
const { authenticate } = require("../../middleware/authMiddleware");
const { checkClubRole } = require("../../middleware/clubRoleMiddleware");

// 1. Get user's role in a specific club
router.get("/:clubId/my-role", authenticate, async (req, res) => {
    try {
        const membership = await ClubMember.findOne({
            userId: req.user.userId,
            clubId: req.params.clubId
        });

        if (!membership) {
            return res.json({ role: "guest" });
        }

        res.json({ role: membership.role, domain: membership.domain });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch role" });
    }
});

// 2. Join a club
router.post("/:clubId/join", authenticate, async (req, res) => {
    try {
        const existing = await ClubMember.findOne({
            userId: req.user.userId,
            clubId: req.params.clubId
        });

        if (existing) {
            return res.status(400).json({ error: "Already a member" });
        }

        const membership = new ClubMember({
            userId: req.user.userId,
            clubId: req.params.clubId,
            role: "member"
        });

        await membership.save();
        res.status(201).json({ message: "Joined club successfully", membership });
    } catch (error) {
        res.status(500).json({ error: "Failed to join club" });
    }
});

// 4. Get club members with details (Leader/Core View)
router.get("/:clubId/members", authenticate, checkClubRole(["leader", "core", "subcore"]), async (req, res) => {
    try {
        const members = await ClubMember.find({ clubId: req.params.clubId })
            .populate("userId", "fullName email department year profileImage")
            .sort({ joinedAt: -1 });

        res.json(members);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch members" });
    }
});

// 5. Promote/Demote Member (Leader only)
router.put("/:clubId/promote", authenticate, checkClubRole(["leader"]), async (req, res) => {
    try {
        const { targetUserId, newRole, domain } = req.body;

        const membership = await ClubMember.findOneAndUpdate(
            { userId: targetUserId, clubId: req.params.clubId },
            { role: newRole, domain: domain || "None" },
            { new: true }
        );

        if (!membership) return res.status(404).json({ error: "Member not found" });

        res.json({ message: "Member promoted successfully", membership });
    } catch (error) {
        res.status(500).json({ error: "Promotion failed" });
    }
});

// 6. Club Analytics (Aggregated)
router.get("/:clubId/analytics", authenticate, checkClubRole(["leader", "core"]), async (req, res) => {
    try {
        const clubId = new mongoose.Types.ObjectId(req.params.clubId);

        // Role Distribution
        const roleStats = await ClubMember.aggregate([
            { $match: { clubId: clubId } },
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // Domain Distribution
        const domainStats = await ClubMember.aggregate([
            { $match: { clubId: clubId } },
            { $group: { _id: "$domain", count: { $sum: 1 } } }
        ]);

        // Member Growth (Sample aggregation by month)
        const growthStats = await ClubMember.aggregate([
            { $match: { clubId: clubId } },
            {
                $group: {
                    _id: { $month: "$joinedAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Event stats
        const events = await Event.find({ club: clubId });
        const totalEvents = events.length;

        res.json({
            roleStats: roleStats.map(s => ({ role: s._id, count: s.count })),
            domainStats: domainStats.map(s => ({ domain: s._id, count: s.count })),
            growthStats: growthStats.map(s => ({ month: s._id, count: s.count })),
            totalEvents
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

// 7. Assign Role to Event (Event Lead/Core)
router.post("/events/:eventId/assign-role", authenticate, async (req, res) => {
    try {
        const { targetUserId, role, assignedTask } = req.body;
        const { eventId } = req.params;

        const eventMember = await EventMember.findOneAndUpdate(
            { userId: targetUserId, eventId: eventId },
            { role, assignedTask, taskStatus: "Pending" },
            { new: true, upsert: true }
        );

        res.json({ message: "Role assigned to event member", eventMember });
    } catch (error) {
        res.status(500).json({ error: "Failed to assign event role" });
    }
});

// 8. Update Task Status (Self or Manager)
router.put("/events/:eventId/tasks", authenticate, async (req, res) => {
    try {
        const { taskStatus, assignedTask } = req.body;
        const { eventId } = req.params;

        const eventMember = await EventMember.findOneAndUpdate(
            { userId: req.user.userId, eventId: eventId },
            { taskStatus, assignedTask },
            { new: true }
        );

        if (!eventMember) return res.status(404).json({ error: "No task assigned" });

        res.json({ message: "Task updated", eventMember });
    } catch (error) {
        res.status(500).json({ error: "Failed to update task" });
    }
});

// 9. Get Event Members (Leads only)
router.get("/events/:eventId/members", authenticate, async (req, res) => {
    try {
        const members = await EventMember.find({ eventId: req.params.eventId })
            .populate("userId", "fullName email profileImage");
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch event members" });
    }
});

module.exports = router;
