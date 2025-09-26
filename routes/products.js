const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const validateRole = require('../middleware/validateRole');

// @route   GET /api/products
// @desc    Obtener todos los productos
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { category, active, search } = req.query;
    
    let filter = {};
    if (category) filter.category = category;
    if (active) filter.active = active === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos'
    });
  }
});

// @route   GET /api/products/low-stock
// @desc    Obtener productos con stock bajo
// @access  Private (Admin)
router.get('/low-stock', auth, validateRole('admin'), async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$stock', '$minStock'] },
      active: true
    }).sort({ stock: 1 });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error obteniendo productos con stock bajo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos'
    });
  }
});

// @route   GET /api/products/:id
// @desc    Obtener producto por ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto'
    });
  }
});

// @route   POST /api/products
// @desc    Crear nuevo producto
// @access  Private (Admin)
router.post('/', auth, validateRole('admin'), async (req, res) => {
  try {
    const { code, name, category, price, cost, stock, minStock, description, supplier } = req.body;

    // Validaciones
    if (!code || !name || !category || !price || cost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: código, nombre, categoría, precio y costo'
      });
    }

    // Verificar código único
    const existingProduct = await Product.findOne({ code });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'El código de producto ya existe'
      });
    }

    // Determinar cuenta contable según categoría
    let accountCode = '4.1.01'; // Por defecto alimentos
    if (category === 'beverage') accountCode = '4.1.02';

    const product = await Product.create({
      code,
      name,
      category,
      price,
      cost,
      stock: stock || 0,
      minStock: minStock || 5,
      description,
      supplier,
      accountCode
    });

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      product
    });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear producto'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Actualizar producto
// @access  Private (Admin)
router.put('/:id', auth, validateRole('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      product[key] = updates[key];
    });

    await product.save();

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      product
    });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar producto'
    });
  }
});

// @route   PUT /api/products/:id/stock
// @desc    Actualizar stock de producto
// @access  Private (Admin)
router.put('/:id/stock', auth, validateRole('admin'), async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' o 'subtract'

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    if (operation === 'add') {
      product.stock += quantity;
    } else if (operation === 'subtract') {
      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Stock insuficiente'
        });
      }
      product.stock -= quantity;
    } else {
      product.stock = quantity;
    }

    await product.save();

    res.json({
      success: true,
      message: 'Stock actualizado exitosamente',
      product
    });
  } catch (error) {
    console.error('Error actualizando stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar stock'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Eliminar producto
// @access  Private (Admin)
router.delete('/:id', auth, validateRole('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto'
    });
  }
});

module.exports = router;