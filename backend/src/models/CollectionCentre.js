import mongoose from 'mongoose';

const collectionCentreSchema = new mongoose.Schema(
  {
    centerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    taluk: String,
    district: {
      type: String,
      required: true,
      index: true
    },
    storageCapacityLiters: {
      type: Number,
      required: true,
      default: 5000
    },
    geoCoordinates: {
      lat: Number,
      lng: Number
    },
    contactPerson: {
      name: String,
      phone: String
    },
    assignedBmcAssetIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
      }
    ],
    orgScope: {
      cooperativeZone: { type: String, required: true },
      plantId: String,
      centerId: String
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const CollectionCentre = mongoose.model('CollectionCentre', collectionCentreSchema);

