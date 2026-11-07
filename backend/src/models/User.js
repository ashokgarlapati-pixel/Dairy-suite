import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.TECHNICIAN,
      required: true,
      index: true
    },
    orgScope: {
      cooperativeZone: { type: String, default: 'ALL' },
      assignedPlants: [{ type: String }],
      assignedCenters: [{ type: String }]
    },
    phone: {
      type: String,
      trim: true
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'DEACTIVATED', 'SUSPENDED', 'INVITED'],
      default: 'ACTIVE',
      index: true
    },
    lastLoginAt: {
      type: Date
    },
    lastLoginIp: {
      type: String
    },
    accessHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        ip: String,
        userAgent: String,
        success: Boolean
      }
    ],
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: '__v'
  }
);

// Method to sanitize user object for client responses (strips passwordHash)
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

export const User = mongoose.model('User', userSchema);

