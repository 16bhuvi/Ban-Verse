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
  },
  results: {
    published: { type: Boolean, default: false },
    winners: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        position: { type: String }, // "1st", "2nd", "3rd", etc.
        certificateUrl: { type: String } // Base64 or Cloudinary URL for the unique certificate
      }
    ]
  }
}, { timestamps: true, strictPopulate: false });

eventSchema.index({ club: 1, date: -1 });

module.exports = mongoose.models.Event || mongoose.model("Event", eventSchema);