const mongoose = require("mongoose");
const User = require("./models/User");
const Club = require("./models/Club");
const Event = require("./models/Event");
require("dotenv").config();

async function checkMayukh() {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ fullName: /Mayukh/i }).lean();
    if (!user) {
        console.log("No user found with name Mayukh");
        process.exit(0);
    }
    console.log(`Found user ${user.fullName} with ID ${user._id}`);
    const clubs = await Club.find({ $or: [{ leaderId: user._id }, { leader: user._id }] }).lean();
    console.log(`User leads ${clubs.length} clubs:`, clubs.map(c => ({ name: c.name, id: c._id })));
    
    for (const c of clubs) {
        const events = await Event.countDocuments({ club: c._id });
        console.log(`Club ${c.name} has ${events} events total`);
    }
    process.exit(0);
}
checkMayukh();
