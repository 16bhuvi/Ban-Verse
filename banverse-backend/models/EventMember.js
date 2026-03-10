const mongoose = require("mongoose");

const eventMemberSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },
        role: {
            type: String,
            enum: ["eventLead", "core", "subcore", "participant"],
            default: "participant"
        },
        taskStatus: {
            type: String,
            enum: ["Pending", "In Progress", "Completed", "None"],
            default: "None"
        },
        attendanceMarked: {
            type: Boolean,
            default: false
        },
        assignedTask: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

eventMemberSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("EventMember", eventMemberSchema);
