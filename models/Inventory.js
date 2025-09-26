const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Crear un índice compuesto para asegurar que solo haya una entrada
// por producto y bodega.
inventorySchema.index({ product: 1, warehouse: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);