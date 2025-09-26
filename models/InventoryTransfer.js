const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String, // Denormalized for easier display
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const inventoryTransferSchema = new mongoose.Schema({
  transferId: {
    type: String,
    required: true,
    unique: true,
    default: () => `TRNSF-${Date.now()}`
  },
  fromWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  toWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  items: [transferItemSchema],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // 'createdAt' will be the request time, 'updatedAt' the confirmation time
});

inventoryTransferSchema.index({ status: 1, fromWarehouse: 1, toWarehouse: 1 });
inventoryTransferSchema.index({ shift: 1 });

module.exports = mongoose.model('InventoryTransfer', inventoryTransferSchema);