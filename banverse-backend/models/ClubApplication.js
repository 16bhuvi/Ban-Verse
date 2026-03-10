const mongoose = require("mongoose");

const clubApplicationSchema = new mongoose.Schema(
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
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        // Optional: applicant can mention preferred domain/message
        message: {
            type: String,
            default: ""
        },
        preferredDomain: {
            type: String,
            default: ""
        },
        // Set by leader on approval
        assignedMembershipType: {
            type: String,
            enum: ["Core Member", "General Member"],
            default: "General Member"
        },
        assignedDomain: {
            type: String,
            default: ""
        },
        reviewedAt: {
            type: Date
        }
    },
    { timestamps: true }
);

// Ensure a user can only have one pending/active application per club
clubApplicationSchema.index({ userId: 1, clubId: 1 }, { unique: true });

module.exports = mongoose.models.ClubApplication || mongoose.model("ClubApplication", clubApplicationSchema);
