const mongoose = require('mongoose');

const comboItemSchema = new mongoose.Schema({
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
  }
});

const productSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'beverage', 'combo', 'other']
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: 0
  },
  cost: {
    type: Number,
    required: [true, 'El costo es requerido'],
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  minStock: {
    type: Number,
    default: 5,
    min: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  supplier: {
    name: String,
    contact: String,
    phone: String
  },
  image: {
    type: String,
    default: '/images/default-product.png'
  },
  accountCode: {
    type: String,
    default: '4.1.01'
  },
  // NUEVO: Para combos
  isCombo: {
    type: Boolean,
    default: false
  },
  comboItems: [comboItemSchema]
}, {
  timestamps: true
});

// Índices
productSchema.index({ code: 1 });
productSchema.index({ category: 1, active: 1 });
productSchema.index({ name: 'text' });

// Virtual para margen de utilidad
productSchema.virtual('profitMargin').get(function() {
  if (this.price === 0) return 0;
  return ((this.price - this.cost) / this.price * 100).toFixed(2);
});

// Método para verificar stock bajo
productSchema.methods.isLowStock = function() {
  return this.stock <= this.minStock;
};

// Método para verificar disponibilidad de combo
productSchema.methods.isComboAvailable = async function() {
  if (!this.isCombo) return this.stock > 0;
  
  for (const item of this.comboItems) {
    const product = await mongoose.model('Product').findById(item.product);
    if (!product || product.stock < item.quantity) {
      return false;
    }
  }
  return true;
};

// Método para obtener stock disponible del combo
productSchema.methods.getComboAvailableStock = async function() {
  if (!this.isCombo) return this.stock;
  
  let minAvailable = Infinity;
  
  for (const item of this.comboItems) {
    const product = await mongoose.model('Product').findById(item.product);
    if (!product) return 0;
    const availableForThisItem = Math.floor(product.stock / item.quantity);
    minAvailable = Math.min(minAvailable, availableForThisItem);
  }
  
  return minAvailable === Infinity ? 0 : minAvailable;
};

module.exports = mongoose.model('Product', productSchema);