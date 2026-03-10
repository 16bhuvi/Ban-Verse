const User = require("../models/User");
const bcrypt = require("bcryptjs");

const createAdmin = async () => {
    try {
        const adminEmail = "anshumanshashtri26@banasthali.in";
        const adminExists = await User.findOne({ email: adminEmail });

        if (adminExists) {
            console.log("✅ Admin already exists");
            adminExists.globalRole = "admin";
            adminExists.isVerified = true;
            await adminExists.save();
            return;
        }

        const hashedPassword = await bcrypt.hash("shashtri26@02", 10);

        const admin = new User({
            fullName: "Super Admin",
            email: adminEmail,
            password: hashedPassword,
            globalRole: "admin",
            isVerified: true
        });

        await admin.save();

        console.log("🚀 Admin created successfully");
    } catch (error) {
        console.log("❌ Error creating admin:", error);
    }
};

module.exports = createAdmin;
