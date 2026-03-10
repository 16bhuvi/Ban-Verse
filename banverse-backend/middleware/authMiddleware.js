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

module.exports = { authenticate, authorize, checkOwnership };
