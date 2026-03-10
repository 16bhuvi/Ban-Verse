const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  date: Date,
  location: String,
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  category: {
    type: String,
    enum: ["Technical", "Cultural", "Workshop", "Hackathon", "Seminar", "Sports", "Entrepreneurship"],
    default: "Technical"
  },
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club"
  },
  domain: {
    type: String,
    enum: ["Technical", "Cultural", "Management", "Media", "Open"],
    default: "Open"
  },
  time: String,
  poster: String,
  regLink: String,
  contact: String,
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  attendedParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  attendanceMarked: {
    type: Boolean,
    default: false
  },
  isPast: {
    type: Boolean,
    default: false
  }
}, { timestamps: true, strictPopulate: false });

module.exports = mongoose.models.Event || mongoose.model("Event", eventSchema);