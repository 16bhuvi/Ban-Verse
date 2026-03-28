console.log("🚀 Starting Banverse Backend (DEBUG-ID-999)...");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

console.log("📦 Dependencies loaded");

mongoose.set('strictQuery', false);
mongoose.set('strictPopulate', false);

const authRoutes = require("./models/routes/auth");
const dashboardRoutes = require("./models/routes/dashboard");
const clubsRoutes = require("./models/routes/clubs");
const eventRoutes = require("./models/routes/events");
const searchRoutes = require("./models/routes/search");
const userRoutes = require("./models/routes/user");
const notificationRoutes = require("./models/routes/notifications");
const adminRoutes = require("./models/routes/admin");
const clubLeaderRoutes = require("./models/routes/clubLeader");
const clubManagementRoutes = require("./models/routes/clubManagement");
const analyticsRoutes = require("./models/routes/analytics");

// Ensure ClubApplication model is registered
require("./models/ClubApplication");
console.log("🛣️ Routes imported");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5001",
];

console.log("🌐 Configuring CORS...");
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

app.get("/api/ping", (req, res) => res.json({ status: "alive" }));

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(200);
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/clubs", clubsRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/club-leader", clubLeaderRoutes);
app.use("/api/club", clubManagementRoutes);
app.use("/api/analytics", analyticsRoutes);
console.log("✅ Routes mounted");

const createAdmin = require("./utils/createAdmin");

// MongoDB Connection
console.log("🔗 Connecting to MongoDB...");
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log("✅ Connected to MongoDB Atlas");
    await createAdmin();  // 🔥 This creates admin automatically
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:");
    console.error(err);
    process.exit(1);
  });

// Root Route
app.get("/", (req, res) => {
  res.send("Banverse API is running...");
});

app.use((req, res) => {
  console.log(`❌ 404 NOT FOUND: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Registered Routes: /api/auth, /api/dashboard, /api/clubs, /api/events, /api/search, /api/user, /api/notifications, /api/admin, /api/club-leader, /api/analytics`);
}).on('error', (err) => {
  console.error("❌ Server failed to start:");
  console.error(err);
  process.exit(1);
});