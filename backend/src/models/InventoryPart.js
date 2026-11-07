import mongoose from 'mongoose';

const inventoryPartSchema = new mongoose.Schema(
  {
    partNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    partName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['REFRIGERATION', 'SEALS_GASKETS', 'PUMPS_MOTORS', 'ELECTRICAL', 'SENSORS', 'CONSUMABLES'],
      required: true,
      index: true
    },
    quantityOnHand: {
      type: Number,
      default: 0,
      min: 0
    },
    minReorderLevel: {
      type: Number,
      default: 5
    },
    unitCost: {
      type: Number,
      required: true // in INR
    },
    storageLocation: {
      type: String, // e.g. "Warehouse B, Bin 14"
      default: 'Central Plant Store'
    },
    compatibleAssetCategories: [
      {
        type: String
      }
    ],
    orgScope: {
      cooperativeZone: String
    }
  },
  {
    timestamps: true
  }
);

export const InventoryPart = mongoose.model('InventoryPart', inventoryPartSchema);

