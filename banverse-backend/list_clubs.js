const mongoose = require("mongoose");
const Club = require("./models/Club");
require("dotenv").config();

async function listClubs() {
    await mongoose.connect(process.env.MONGO_URI);
    const clubs = await Club.find().select('name').lean();
    console.log("Clubs in DB:", clubs);
    process.exit(0);
}
listClubs();
