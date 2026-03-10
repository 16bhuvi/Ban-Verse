const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const Event = require("./models/Event");
const Club = require("./models/Club");

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const eventSchema = Event.schema;
    console.log("Event Schema Paths:", Object.keys(eventSchema.paths));

    const userSchema = User.schema;
    console.log("User Schema Paths:", Object.keys(userSchema.paths));

    try {
        const oneEvent = await Event.findOne();
        if (oneEvent) {
            console.log("Trying to populate club on event:", oneEvent._id);
            const populated = await Event.findById(oneEvent._id).populate("club");
            console.log("Success! Club name:", populated.club?.name);
        } else {
            console.log("No events found to test.");
        }
    } catch (err) {
        console.error("DEBUG FETCH ERROR:", err.message);
    }

    process.exit(0);
}

debug();
