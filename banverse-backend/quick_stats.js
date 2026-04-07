const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    console.log("Connecting to", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected.");
    
    const User = mongoose.model('User', new mongoose.Schema({ globalRole: String }));
    const Event = mongoose.model('Event', new mongoose.Schema({ date: Date }));
    const Club = mongoose.model('Club', new mongoose.Schema({ isActive: Boolean }));
    
    const students = await User.countDocuments({ globalRole: 'student' });
    const clubs = await Club.countDocuments({ isActive: true });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const events = await Event.countDocuments({ date: { $gte: thirtyDaysAgo } });
    
    console.log("STATS_START");
    console.log("STUDENTS:", students);
    console.log("CLUBS:", clubs);
    console.log("EVENTS:", events);
    console.log("STATS_END");
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("DIAGNOSTIC ERROR:", err);
    process.exit(1);
  }
}

run();
