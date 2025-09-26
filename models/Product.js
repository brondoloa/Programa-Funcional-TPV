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

// Virtual para stock (representa el stock en la cocina, que es el relevante para ventas)
productSchema.virtual('stock').get(function() {
  // Nota: Este es un placeholder. El stock real es asíncrono.
  // Se recomienda usar el método getStockForSale() en las rutas.
  return 0;
});

// Método para obtener el stock de una bodega específica (ej. Cocina)
productSchema.methods.getStockForSale = async function() {
  // Asumimos que la bodega de venta se llama 'Cocina'. Esto debería ser configurable.
  const saleWarehouse = await mongoose.model('Warehouse').findOne({ name: 'Cocina' });
  if (!saleWarehouse) return 0;

  const inventory = await mongoose.model('Inventory').findOne({
    product: this._id,
    warehouse: saleWarehouse._id
  });

  return inventory ? inventory.quantity : 0;
};

// Método para verificar disponibilidad de combo, basado en el stock de 'Cocina'
productSchema.methods.isComboAvailable = async function() {
  // Asumimos que la bodega de venta se llama 'Cocina'.
  const saleWarehouse = await mongoose.model('Warehouse').findOne({ name: 'Cocina' });
  if (!saleWarehouse) return false; // Si no hay bodega 'Cocina', no se puede vender

  if (!this.isCombo) {
    const inventory = await mongoose.model('Inventory').findOne({ product: this._id, warehouse: saleWarehouse._id });
    return inventory && inventory.quantity > 0;
  }
  
  for (const item of this.comboItems) {
    const inventoryItem = await mongoose.model('Inventory').findOne({ product: item.product, warehouse: saleWarehouse._id });
    if (!inventoryItem || inventoryItem.quantity < item.quantity) {
      return false;
    }
  }
  return true;
};

// Método para obtener stock disponible del combo, basado en el stock de 'Cocina'
productSchema.methods.getComboAvailableStock = async function() {
  // Asumimos que la bodega de venta se llama 'Cocina'.
  const saleWarehouse = await mongoose.model('Warehouse').findOne({ name: 'Cocina' });
  if (!saleWarehouse) return 0;

  if (!this.isCombo) {
    const inventory = await mongoose.model('Inventory').findOne({ product: this._id, warehouse: saleWarehouse._id });
    return inventory ? inventory.quantity : 0;
  }
  
  let minAvailable = Infinity;
  
  for (const item of this.comboItems) {
    const inventoryItem = await mongoose.model('Inventory').findOne({ product: item.product, warehouse: saleWarehouse._id });
    const stock = inventoryItem ? inventoryItem.quantity : 0;
    const availableForThisItem = Math.floor(stock / item.quantity);
    minAvailable = Math.min(minAvailable, availableForThisItem);
  }
  
  return minAvailable === Infinity ? 0 : minAvailable;
};

module.exports = mongoose.model('Product', productSchema);