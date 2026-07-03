// backend/models/User.js
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
  },
  profileImage: {
    type: String,
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
  joinDate: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpire: {
    type: Date,
  },
  // Coding-specific fields
  codingStats: {
    totalSolved: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    totalAccepted: { type: Number, default: 0 },
  },
  solvedProblems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
    },
  ],
});

// Custom Schema Methods
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

export default mongoose.model("User", userSchema);
