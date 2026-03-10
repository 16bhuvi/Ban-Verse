const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    department: {
      type: String,
      required: false,
    },
    year: {
      type: String,
      required: false,
    },
    globalRole: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    bio: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    resetOtp: {
      type: String,
    },
    resetOtpExpiry: {
      type: Date,
    },
    interests: [
      {
        type: String,
      },
    ],
    profileImage: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
    },
    resume: {
      type: String,
      default: "",
    },
    joinedClubs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
      },
    ],
    registeredEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    points: {
      type: Number,
      default: 0,
    },
    isClubLeader: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strictPopulate: false
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);