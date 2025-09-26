const mongoose = require('mongoose');

const accountingLineSchema = new mongoose.Schema({
  accountCode: {
    type: String,
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  debit: {
    type: Number,
    default: 0,
    min: 0
  },
  credit: {
    type: Number,
    default: 0,
    min: 0
  }
});

const accountingEntrySchema = new mongoose.Schema({
  entryNumber: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['sale', 'purchase', 'expense', 'adjustment', 'opening', 'closing'],
    required: true
  },
  lines: [accountingLineSchema],
  totalDebit: {
    type: Number,
    required: true
  },
  totalCredit: {
    type: Number,
    required: true
  },
  referenceType: {
    type: String,
    enum: ['order', 'cash_register', 'manual']
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: String,
  status: {
    type: String,
    enum: ['active', 'void'],
    default: 'active'
  },
  voidedAt: Date,
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  voidReason: String
}, {
  timestamps: true
});

// Índices
accountingEntrySchema.index({ entryNumber: 1 });
accountingEntrySchema.index({ date: -1 });
accountingEntrySchema.index({ type: 1, status: 1 });
accountingEntrySchema.index({ 'lines.accountCode': 1 });

// Validar que débito = crédito
accountingEntrySchema.pre('save', function(next) {
  if (Math.abs(this.totalDebit - this.totalCredit) > 0.01) {
    return next(new Error('Los totales de débito y crédito deben ser iguales'));
  }
  next();
});

// Generar número de asiento
accountingEntrySchema.statics.generateEntryNumber = async function() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `${year}${month}`;
  
  const lastEntry = await this.findOne({
    entryNumber: new RegExp(`^${prefix}`)
  }).sort({ entryNumber: -1 });
  
  let sequence = 1;
  if (lastEntry) {
    const lastSequence = parseInt(lastEntry.entryNumber.slice(-5));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(5, '0')}`;
};

module.exports = mongoose.model('AccountingEntry', accountingEntrySchema);