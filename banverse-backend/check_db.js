const mongoose = require('mongoose');
require('dotenv').config();

async function checkUser() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");
    
    // We get the raw connection to see collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections in DB:", collections.map(c => c.name));

    const User = mongoose.connection.db.collection('users');
    
    // Searching for Suprabha Sah with a very broad regex
    const user = await User.findOne({ fullName: { $regex: /suprabha sah/i } });
    
    if (user) {
      console.log("\n!!! USER DATA FOUND !!!");
      console.log("ID:", user._id);
      console.log("Name:", user.fullName);
      console.log("Email:", user.email);
      console.log("Interests:", JSON.stringify(user.interests));
      console.log("Resume Presence:", user.resume ? "YES (Has content)" : "NO (Empty)");
      console.log("Points Field:", user.points);
      console.log("Joined Clubs Count:", user.joinedClubs ? user.joinedClubs.length : 0);
      console.log("------------------------");
    } else {
      const allUsers = await User.find({}).limit(5).toArray();
      console.log("\n!!! USER NOT FOUND !!!");
      console.log("Search was for: 'suprabha sah'");
      console.log("Recent Users in DB:", allUsers.map(u => u.fullName));
    }
    
    process.exit(0);
  } catch (err) {
    console.error("CRITICAL DB ERROR:", err);
    process.exit(1);
  }
}

checkUser();
