const ClubMember = require("../models/ClubMember");

/**
 * Middleware to check if a user is a member of a club and has a required level of role
 * @param {Array} requiredRoles - Roles allowed (leader, core, subcore, member)
 */
const checkClubRole = (requiredRoles = []) => {
    return async (req, res, next) => {
        try {
            const clubId = req.params.clubId || req.body.clubId;
            if (!clubId) {
                return res.status(400).json({ error: "Club ID is required." });
            }

            const membership = await ClubMember.findOne({
                userId: req.user.userId,
                clubId: clubId
            });

            if (!membership) {
                return res.status(403).json({ error: "Access denied. You are not a member of this club." });
            }

            if (requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
                return res.status(403).json({ error: "Insufficient permissions within the club." });
            }

            // Attach membership info to request for downstream use
            req.clubMembership = membership;
            next();
        } catch (error) {
            console.error("Club Role Middleware Error:", error);
            res.status(500).json({ error: "Server error during club role verification." });
        }
    };
};

module.exports = { checkClubRole };
