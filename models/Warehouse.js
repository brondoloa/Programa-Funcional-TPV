const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la bodega es requerido'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

warehouseSchema.index({ name: 1 });

module.exports = mongoose.model('Warehouse', warehouseSchema);