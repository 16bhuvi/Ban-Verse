const mongoose = require("mongoose");

const domainSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" }
}, { _id: true });

const clubSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        vision: {
            type: String,
            default: "",
        },
        logo: {
            type: String,
            default: "",
        },
        category: {
            type: String,
            enum: ["Technical", "Cultural", "Workshop", "Hackathon", "Seminar", "Sports", "Entrepreneurship"],
            default: "Technical"
        },
        leaderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        // Legacy field (keep for backward compat with old clubLeader routes)
        leader: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        membershipTypes: {
            type: [String],
            default: ["Core Member", "General Member"]
        },
        domains: {
            type: [domainSchema],
            default: []
        },
        // Legacy members array (keep for backward compat)
        members: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                role: { type: String, enum: ["leader", "core", "subcore", "member"], default: "member" },
                domain: { type: String, default: "General" },
                joinedAt: { type: Date, default: Date.now }
            },
        ],
        subCoordinators: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        gallery: [
            {
                url: String,
                caption: String,
                uploadedAt: { type: Date, default: Date.now }
            }
        ],
        approved: {
            type: Boolean,
            default: true // Admin-created clubs are auto-approved
        },
        isActive: {
            type: Boolean,
            default: true
        },
        email: String,
        phone: String,
        instagram: String,
        linkedin: String
    },
    {
        timestamps: true,
        strictPopulate: false
    }
);

module.exports = mongoose.models.Club || mongoose.model("Club", clubSchema);
