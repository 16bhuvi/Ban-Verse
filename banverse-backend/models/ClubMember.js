const mongoose = require("mongoose");

const clubMemberSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        clubId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            required: true
        },
        membershipType: {
            type: String,
            enum: ["Core Member", "General Member"],
            default: "General Member"
        },
        // Legacy role field (keep for backward compat)
        role: {
            type: String,
            enum: ["leader", "core", "subcore", "member"],
            default: "member"
        },
        domain: {
            type: String,
            default: "None"
        },
        isLeader: {
            type: Boolean,
            default: false
        },
        roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ClubRole"
        },
        customTitle: {
            type: String,
            default: ""
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Ensure unique membership
clubMemberSchema.index({ userId: 1, clubId: 1 }, { unique: true });

module.exports = mongoose.models.ClubMember || mongoose.model("ClubMember", clubMemberSchema);
