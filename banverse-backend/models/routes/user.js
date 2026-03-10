const express = require("express");
const router = express.Router();
const User = require("../User");
const { authenticate } = require("../../middleware/authMiddleware");

// PUT /api/user/update-profile
router.put("/update-profile", authenticate, async (req, res) => {
    const { fullName, department, year, bio, interests, profileImage, resume } = req.body;
    const userId = req.user.userId;

    try {
        const updateData = {
            fullName,
            department,
            year,
            bio,
            interests,
            resume
        };

        // If profileImage is explicitly null or empty, reset to default
        if (profileImage === null || profileImage === "") {
            updateData.profileImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
        } else if (profileImage) {
            updateData.profileImage = profileImage;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) return res.status(404).json({ error: "User not found" });

        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

module.exports = router;
