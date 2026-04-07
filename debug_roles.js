const mongoose = require('mongoose');
const Club = require('./banverse-backend/models/Club.js');
const ClubMember = require('./banverse-backend/models/ClubMember.js');
const ClubRole = require('./banverse-backend/models/ClubRole.js');
const User = require('./banverse-backend/models/User.js');

mongoose.connect('mongodb://localhost:27017/banverse').then(async () => {
    const club = await Club.findOne({ name: 'build cv' });
    console.log('Club:', club._id);
    const members = await ClubMember.find({ clubId: club._id }).populate('userId roleId');
    for (let m of members) {
        console.log('User:', m.userId.fullName, '| Role:', m.roleId ? m.roleId.roleName : 'None', '| Permissions:', m.roleId ? m.roleId.permissions : 'None');
    }
    process.exit(0);
});
