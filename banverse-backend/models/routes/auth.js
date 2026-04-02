const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../User");
const Club = require("../Club");
const ClubMember = require("../ClubMember");

// Email Transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper: Generate JWT
const generateToken = (res, user, isClubLeader = false) => {
  const token = jwt.sign(
    { userId: user._id, globalRole: user.globalRole, isClubLeader, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  return token;
};

// Helper: Get full user info including club membership details
const getUserClubInfo = async (userId) => {
  // Check new ClubMember model for leader
  const leaderMembership = await ClubMember.findOne({ userId, isLeader: true });
  if (leaderMembership) {
    return { isClubLeader: true, membershipType: "Core Member", clubId: leaderMembership.clubId };
  }
  // Check legacy Club.leader field
  const ownedClub = await Club.findOne({ $or: [{ leaderId: userId }, { leader: userId }] });
  if (ownedClub) {
    return { isClubLeader: true, membershipType: "Core Member", clubId: ownedClub._id };
  }
  // Check if core member
  const coreMembership = await ClubMember.findOne({ userId, membershipType: "Core Member" });
  if (coreMembership) {
    return { isClubLeader: false, membershipType: "Core Member", clubId: coreMembership.clubId };
  }
  // Regular member
  const anyMembership = await ClubMember.findOne({ userId });
  return {
    isClubLeader: false,
    membershipType: anyMembership ? anyMembership.membershipType : null,
    clubId: anyMembership ? anyMembership.clubId : null
  };
};

// 1. Register Student
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, course, branch, year } = req.body;

    if (!fullName || !email || !password || !course || !branch || !year) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Domain restriction
    if (!email.toLowerCase().endsWith("@banasthali.in")) {
      return res.status(400).json({ error: "Only Banasthali Vidyapith official emails are allowed." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ error: "Email already registered and verified." });
      } else {
        // User exists but not verified - remove them so we can re-create or just update
        await User.deleteOne({ _id: existingUser._id });
      }
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      department: `${course} - ${branch}`,
      year,
      globalRole: "student",
      otp,
      otpExpiry,
      isVerified: false,
    });

    await newUser.save();

    // Send OTP Email
    try {
      await transporter.sendMail({
        from: `"Ban-verse" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify your Ban-verse Account",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Welcome to Ban-verse!</h2>
            <p>Your OTP for account verification is:</p>
            <h1 style="color: #6366f1; letter-spacing: 5px;">${otp}</h1>
            <p>This code will expire in 5 minutes.</p>
          </div>
        `,
      });
      console.log(`📧 OTP sent to ${email}: ${otp}`);
    } catch (emailError) {
      console.error("📧 Email Sending Failed:", emailError);
      // We still return 201 because the user is created, but warn the user or handle it
      return res.status(201).json({
        message: "User created, but OTP email failed to send. Please contact support.",
        debug_otp: process.env.NODE_ENV === "development" ? otp : undefined
      });
    }

    res.status(201).json({ message: "OTP sent to your email. Please verify." });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// 1.5 Resend OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.isVerified) return res.status(400).json({ error: "Account already verified." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP Email
    await transporter.sendMail({
      from: `"Ban-verse" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your New OTP for Ban-verse",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6366f1;">New Verification Code</h2>
          <p>Your new OTP for account verification is:</p>
          <h1 style="color: #6366f1; letter-spacing: 5px; background: #f3f4f6; padding: 10px; display: inline-block;">${otp}</h1>
          <p>This code will expire in 5 minutes.</p>
        </div>
      `,
    });

    console.log(`📧 New OTP sent to ${email}: ${otp}`);
    res.status(200).json({ message: "A new OTP has been sent to your email." });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ error: "Failed to resend OTP." });
  }
});

// 2. Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.isVerified) return res.status(400).json({ error: "Account already verified." });

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const clubInfo = await getUserClubInfo(user._id);
    const token = generateToken(res, user, clubInfo.isClubLeader);

    res.status(200).json({
      message: "Verification successful.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        globalRole: user.globalRole,
        isClubLeader: clubInfo.isClubLeader,
        membershipType: clubInfo.membershipType,
        clubId: clubInfo.clubId
      },
    });
  } catch (error) {
    console.error("OTP Verification error:", error);
    res.status(500).json({ error: "Server error during verification." });
  }
});

// 3. Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials." });

    if (!user.isVerified) {
      return res.status(401).json({ error: "Please verify your email first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials." });

    const clubInfo = await getUserClubInfo(user._id);
    const token = generateToken(res, user, clubInfo.isClubLeader);

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        globalRole: user.globalRole,
        isClubLeader: clubInfo.isClubLeader,
        membershipType: clubInfo.membershipType,
        clubId: clubInfo.clubId
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login." });
  }
});

// 4. Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully." });
});

// 5. Forgot Password - Request OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "No user found with this email." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    console.log(`🔑 Password Reset OTP for ${email}: ${otp}`);

    await transporter.sendMail({
      from: `"Ban-verse" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h3>Password Reset Code</h3>
          <p>Your OTP for resetting your Ban-verse password is:</p>
          <h1 style="color: #6366f1;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `
    });

    res.json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// 6. Verify Reset OTP
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.resetOtp !== otp || user.resetOtpExpiry < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    res.json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    res.status(500).json({ error: "Verification failed." });
  }
});

// 7. Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.resetOtp !== otp || user.resetOtpExpiry < Date.now()) {
      return res.status(400).json({ error: "Unauthorized reset attempt." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful. You can now login." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

module.exports = router;