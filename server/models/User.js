import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() { return !this.ssoProvider; },
    select: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['RM', 'ASM', 'BM', 'RSM', 'ADMIN'],
    required: true
  },
  phone: String,
  avatar: String,
  
  // Hierarchy
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  regionCode: String,
  branchCode: String,
  
  // Targets
  targetAum: { type: Number, default: 0 },
  targetSip: { type: Number, default: 0 },
  
  // SSO
  ssoProvider: {
    type: String,
    enum: ['google', 'azure', null]
  },
  ssoId: String,
  
  // Status
  isActive: { type: Boolean, default: true },
  lastLogin: Date,

  /** Stable key from HTML mock / HR import (e.g. USR_RM_101) — sparse unique */
  stableUserKey: { type: String, trim: true, unique: true, sparse: true }
}, {
  timestamps: true,
  collection: 'users'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method (supports bcrypt; upgrades legacy plaintext from insertMany to bcrypt on success)
userSchema.methods.comparePassword = async function(candidatePassword) {
  const stored = this.password;
  if (!stored) return false;
  if (stored.startsWith('$2')) {
    return bcrypt.compare(candidatePassword, stored);
  }
  if (candidatePassword !== stored) return false;
  this.password = candidatePassword;
  await this.save();
  return true;
};

// Get team members (for managers)
userSchema.methods.getTeamMembers = async function() {
  return mongoose.model('User').find({ managerId: this._id, isActive: true });
};

export default mongoose.model('User', userSchema);
