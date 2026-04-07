const mongoose = require("mongoose");
const Event = require("./models/Event");
const Club = require("./models/Club");
require("dotenv").config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    const events = await Event.find().limit(5).lean();
    console.log("Recent Events:", events.map(e => ({ title: e.title, date: e.date, clubId: e.club })));
    
    if (events.length > 0) {
        const clubId = events[0].club;
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const filtered = await Event.countDocuments({ club: clubId, date: { $gte: sixMonthsAgo } });
        console.log(`Club ${clubId} has ${filtered} events in last 6 months`);
    } else {
        console.log("No events found in DB");
    }
    process.exit(0);
}

check();
