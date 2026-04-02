const mongoose = require("mongoose");

const clubRoleSchema = new mongoose.Schema({
  clubId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Club', 
    required: true 
  },
  roleName: { 
    type: String, 
    required: true,
    trim: true
  }, // e.g., "Marketing Core", "Execution Sub-Core"
  tierLevel: { 
    type: Number, 
    default: 3 
  }, // 1 = Leader, 2 = Core Team, 3 = Sub-Core Team, 4 = Participant
  permissions: {
    canCreateEvents: { type: Boolean, default: false },
    canEditEvents: { type: Boolean, default: false },
    canSendNotifications: { type: Boolean, default: false },
    canManageMembers: { type: Boolean, default: false },
    canEditClubProfile: { type: Boolean, default: false },
    canUploadPhotos: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false }
  }
}, { timestamps: true });

// A club cannot have two roles with the exact same name
clubRoleSchema.index({ clubId: 1, roleName: 1 }, { unique: true });

module.exports = mongoose.models.ClubRole || mongoose.model("ClubRole", clubRoleSchema);
