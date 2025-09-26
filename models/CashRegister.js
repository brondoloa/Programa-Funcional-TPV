const mongoose = require('mongoose');

const cashRegisterSchema = new mongoose.Schema({
  openingDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  closingDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  initialAmount: {
    type: Number,
    required: true,
    min: 0
  },
  expectedAmount: {
    type: Number,
    default: 0
  },
  actualAmount: {
    type: Number,
    default: 0
  },
  difference: {
    type: Number,
    default: 0
  },
  cashSales: {
    type: Number,
    default: 0
  },
  cardSales: {
    type: Number,
    default: 0
  },
  transferSales: {
    type: Number,
    default: 0
  },
  totalSales: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  openedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  openedByName: String,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedByName: String,
  notes: String
}, {
  timestamps: true
});

// Índices
cashRegisterSchema.index({ status: 1 });
cashRegisterSchema.index({ openingDate: -1 });
cashRegisterSchema.index({ openedBy: 1 });

// Método para calcular totales
cashRegisterSchema.methods.calculateTotals = async function() {
  const Order = mongoose.model('Order');
  
  const orders = await Order.find({
    cashRegister: this._id,
    status: { $ne: 'cancelled' }
  });
  
  this.totalOrders = orders.length;
  this.cashSales = orders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0);
  this.cardSales = orders.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + o.total, 0);
  this.transferSales = orders.filter(o => o.paymentMethod === 'transfer').reduce((sum, o) => sum + o.total, 0);
  this.totalSales = this.cashSales + this.cardSales + this.transferSales;
  this.expectedAmount = this.initialAmount + this.cashSales;
  
  return this;
};

module.exports = mongoose.model('CashRegister', cashRegisterSchema);