const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  shiftId: {
    type: String,
    required: true,
    unique: true,
    // Ejemplo: SHIFT-20231225-1
    default: () => `SHIFT-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 1000)}`
  },
  openedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  openingTime: {
    type: Date,
    default: Date.now
  },
  closingTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

shiftSchema.index({ status: 1, openingTime: -1 });

module.exports = mongoose.model('Shift', shiftSchema);