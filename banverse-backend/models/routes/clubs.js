const express = require("express");
const router = express.Router();
const Club = require("../Club");
const ClubMember = require("../ClubMember");
const ClubApplication = require("../ClubApplication");
const User = require("../User");
const { authenticate } = require("../../middleware/authMiddleware");

// GET /api/clubs - Get all active clubs (explore)
router.get("/", authenticate, async (req, res) => {
    try {
        const clubs = await Club.find({ isActive: true })
            .populate("leaderId", "fullName email profileImage")
            .sort("-createdAt");
        res.json(clubs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch clubs" });
    }
});

// GET /api/clubs/:clubId - Get single club detail
router.get("/:clubId", authenticate, async (req, res) => {
    try {
        const club = await Club.findById(req.params.clubId)
            .populate("leaderId", "fullName email profileImage");
        if (!club) return res.status(404).json({ error: "Club not found" });

        // Check if user is a member / has applied
        const membership = await ClubMember.findOne({
            userId: req.user.userId,
            clubId: req.params.clubId
        });
        const application = await ClubApplication.findOne({
            userId: req.user.userId,
            clubId: req.params.clubId
        });

        res.json({
            club,
            membership: membership || null,
            application: application || null
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch club" });
    }
});

// POST /api/clubs/apply/:clubId - Student applies to join a club
router.post("/apply/:clubId", authenticate, async (req, res) => {
    try {
        const { clubId } = req.params;
        const userId = req.user.userId;
        const { message, preferredDomain } = req.body;

        const club = await Club.findById(clubId);
        if (!club || !club.isActive) {
            return res.status(404).json({ error: "Club not found or inactive" });
        }

        // Check if already a member
        const existingMembership = await ClubMember.findOne({ userId, clubId });
        if (existingMembership) {
            return res.status(400).json({ error: "You are already a member of this club" });
        }

        // Check for existing application
        const existingApp = await ClubApplication.findOne({ userId, clubId });
        if (existingApp) {
            if (existingApp.status === "pending") {
                return res.status(400).json({ error: "You already have a pending application for this club" });
            }
            if (existingApp.status === "approved") {
                return res.status(400).json({ error: "Your application was already approved" });
            }
            // Rejected - allow re-application by updating
            existingApp.status = "pending";
            existingApp.message = message || "";
            existingApp.preferredDomain = preferredDomain || "";
            existingApp.reviewedAt = undefined;
            await existingApp.save();
            return res.status(200).json({ message: "Application re-submitted successfully!", application: existingApp });
        }

        const application = await ClubApplication.create({
            userId,
            clubId,
            status: "pending",
            message: message || "",
            preferredDomain: preferredDomain || ""
        });

        res.status(201).json({ message: "Application submitted successfully!", application });
    } catch (error) {
        console.error("Apply club error:", error);
        if (error.code === 11000) {
            return res.status(400).json({ error: "You have already applied to this club." });
        }
        res.status(500).json({ error: "Server error submitting application" });
    }
});

// GET /api/clubs/:clubId/my-membership - Check membership status
router.get("/:clubId/my-membership", authenticate, async (req, res) => {
    try {
        const membership = await ClubMember.findOne({
            userId: req.user.userId,
            clubId: req.params.clubId
        });
        const application = await ClubApplication.findOne({
            userId: req.user.userId,
            clubId: req.params.clubId
        });

        res.json({ membership: membership || null, application: application || null });
    } catch (error) {
        res.status(500).json({ error: "Failed to get membership status" });
    }
});

// GET /api/clubs/my-applications - Student's own applications
router.get("/student/my-applications", authenticate, async (req, res) => {
    try {
        const applications = await ClubApplication.find({ userId: req.user.userId })
            .populate("clubId", "name logo description category")
            .sort("-createdAt");
        res.json(applications);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch applications" });
    }
});

// GET /api/clubs/my-clubs - Student's own club memberships
router.get("/student/my-clubs", authenticate, async (req, res) => {
    try {
        const memberships = await ClubMember.find({ userId: req.user.userId })
            .populate("clubId", "name logo description category leaderId domains")
            .sort("-joinedAt");
        res.json(memberships);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch memberships" });
    }
});

// Legacy: POST /api/clubs/join/:clubId (keeps backward compat)
router.post("/join/:clubId", authenticate, async (req, res) => {
    try {
        const { clubId } = req.params;
        const userId = req.user.userId;

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ error: "Club not found" });
        }

        // Update User and add 10 points
        await User.findByIdAndUpdate(userId, {
            $addToSet: { joinedClubs: clubId },
            $inc: { points: 10 }
        });

        // Update Club legacy members
        await Club.findByIdAndUpdate(clubId, {
            $addToSet: {
                members: {
                    user: userId,
                    role: "member",
                    domain: "General",
                    joinedAt: new Date()
                }
            }
        });

        res.json({ message: "Successfully joined! +10 points awarded." });
    } catch (error) {
        console.error("Join club error:", error);
        res.status(500).json({ error: "Server error joining club" });
    }
});

module.exports = router;
