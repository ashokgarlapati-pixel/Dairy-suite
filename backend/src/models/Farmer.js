import mongoose from 'mongoose';

const farmerSchema = new mongoose.Schema(
  {
    farmerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    phone: String,
    village: {
      type: String,
      required: true
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollectionCentre'
    },
    cattleCount: {
      type: Number,
      default: 4
    },
    bankAccount: {
      bankName: String,
      ifsc: String,
      accountNumber: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    orgScope: {
      cooperativeZone: String
    }
  },
  {
    timestamps: true
  }
);

export const Farmer = mongoose.model('Farmer', farmerSchema);

