const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 1. Verify Authentication
const authenticate = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid or expired token." });
    }
};

// 2. Authorize Roles
const authorize = (roles = []) => {
    if (typeof roles === "string") {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized. Please login." });
        }

        const hasRole = roles.includes(req.user.globalRole);
        const isClubLeader = roles.includes("clubLeader") && req.user.isClubLeader;

        if (!hasRole && !isClubLeader) {
            return res.status(403).json({ error: "Forbidden. Access restricted." });
        }
        next();
    };
};

// 3. Ownership Check Middleware
const checkOwnership = (model) => {
    return async (req, res, next) => {
        try {
            const resource = await model.findById(req.params.id);
            if (!resource) return res.status(404).json({ error: "Resource not found." });

            // Check if creator matches or user is super_admin
            if (resource.creator.toString() !== req.user.userId && req.user.globalRole !== 'admin') {
                return res.status(403).json({ error: "Access denied. You do not own this resource." });
            }
            next();
        } catch (error) {
            res.status(500).json({ error: "Server error during ownership check." });
        }
    };
};

// 4. Dynamic Club Operations Authorization Middleware
const requireClubPermission = (requiredPermission) => async (req, res, next) => {
    try {
        const Club = require("../models/Club");
        const ClubMember = require("../models/ClubMember");
        
        // Grab clubId from params or body depending on route structure
        const clubId = req.params.clubId || req.body.club || req.params.id; 
        if(!clubId) return res.status(400).json({ error: "Missing Target Club ID" });

        const userId = req.user.userId || req.user.id;

        // 1. Bypass check if pure Admin globally or Creator/Leader specifically
        if(req.user.globalRole === 'admin') return next();
        const club = await Club.findById(clubId);
        if(!club) return res.status(404).json({ error: "Club not found" });
        if(club.leaderId.equals(userId) || (club.leader && club.leader.equals(userId))) return next();

        // 2. Resolve Dynamic Member Role
        const member = await ClubMember.findOne({ clubId, userId }).populate('roleId');
        if(!member || member.status === 'suspended') return res.status(403).json({ error: "Access Denied: Not an active member" });

        // 3. Fallback for general participants (they have no roleId or legacy role logic)
        if(!member.roleId && member.role !== 'core' && member.isLeader !== true) {
             return res.status(403).json({ error: "Insufficient Team Access Privileges" });
        }

        // 4. Actual Boolean Validation from Dynamic Hierarchy
        if(member.roleId && member.roleId.permissions[requiredPermission] !== true) {
            return res.status(403).json({ error: "Action strictly restricted by Club Director" });
        }
        
        next();
    } catch(err) {
        console.error("Permission check err:", err);
        res.status(500).json({ error: "Internal Auth Failure" });
    }
}

module.exports = { authenticate, authorize, checkOwnership, requireClubPermission };
