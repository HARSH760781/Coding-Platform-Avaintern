import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  college: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    // WIDE enum — temporary. Narrowed to
    // ["superadmin","admin","subadmin","student"] after migration.
    enum: ["superadmin", "admin", "subadmin", "student", "mentor"],
    default: "student",
  },
  status: {
    type: String,
    enum: ["active", "pending", "rejected"],
    default: "active",
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    default: null,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: null,
  },
  // ⭐ NEW: batch year (e.g. 2024 = joined in 2024)
  batchYear: {
    type: Number,
    default: null,
    index: true,
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  profileImage: {
    type: String,
    // required: true,
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\+?[0-9]{10,15}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid phone number!`,
    },
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },

  // ⭐ Login/Logout tracking
  lastLogin: {
    type: Date,
    default: null,
  },
  lastLogout: {
    type: Date,
    default: null,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },

  // ⭐ Profile timestamps
  joinDate: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },

  // ⭐ REQUIRED FOR FORGOT PASSWORD SYSTEM
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpire: {
    type: Date,
  },
});

// =============================
// Indexes (multi-tenant)
// =============================
userSchema.index({ collegeId: 1, departmentId: 1, role: 1 });
userSchema.index({ collegeId: 1, status: 1, role: 1 });
// ⭐ NEW: fast filtering by college + department + batch
userSchema.index({ collegeId: 1, departmentId: 1, batchYear: 1, role: 1 });

// =============================
// Custom Schema Methods
// =============================

userSchema.methods.updateProfile = function (updateData) {
  this.fullName = updateData.fullName || this.fullName;
  this.phone = updateData.phone || this.phone;
  this.location = updateData.location || this.location;
  this.profileImage = updateData.profileImage || this.profileImage;
  this.lastUpdated = new Date();
  return this.save();
};

userSchema.methods.updateLoginTime = function () {
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  this.lastLogin = nowIST;
  this.isOnline = true;
  return this.save();
};

userSchema.methods.updateLogoutTime = function () {
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  this.lastLogout = nowIST;
  this.isOnline = false;
  return this.save();
};

userSchema.methods.isPending = function () {
  return this.status === "pending";
};

export default mongoose.model("User", userSchema);
