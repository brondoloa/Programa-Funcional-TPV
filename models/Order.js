const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  qrCode: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'transfer'],
    required: true
  },
  status: {
    type: String,
    enum: ['paid', 'delivered', 'cancelled'],
    default: 'paid'
  },
  cashRegister: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashRegister',
    required: true
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cashierName: String,
  deliveredAt: {
    type: Date
  },
  deliveredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String,
  notes: String
}, {
  timestamps: true
});

// Índices
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ cashRegister: 1 });
orderSchema.index({ createdAt: -1 });

// Generar número de orden único
orderSchema.statics.generateOrderNumber = async function() {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const lastOrder = await this.findOne({
    orderNumber: new RegExp(`^${datePrefix}`)
  }).sort({ orderNumber: -1 });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${datePrefix}${sequence.toString().padStart(4, '0')}`;
};

module.exports = mongoose.model('Order', orderSchema);