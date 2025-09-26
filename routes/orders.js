const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const CashRegister = require('../models/CashRegister');
const AccountingEntry = require('../models/AccountingEntry');
const auth = require('../middleware/auth');
const validateRole = require('../middleware/validateRole');
const QRCode = require('qrcode');

// @route   GET /api/orders
// @desc    Obtener todas las órdenes
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, cashRegister, startDate, endDate } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (cashRegister) filter.cashRegister = cashRegister;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error obteniendo órdenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener órdenes'
    });
  }
});

// @route   POST /api/orders
// @desc    Crear nueva orden CON SOPORTE PARA COMBOS
// @access  Private (Admin, Cashier)
router.post('/', auth, validateRole('admin', 'cashier'), async (req, res) => {
  try {
    const { items, paymentMethod, discount = 0, notes } = req.body;

    // Validaciones básicas
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe incluir al menos un producto'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar el método de pago'
      });
    }

    // Verificar caja abierta
    const openCashRegister = await CashRegister.findOne({
      status: 'open',
      openedBy: req.user.id
    });

    if (!openCashRegister) {
      return res.status(400).json({
        success: false,
        message: 'No hay una caja abierta. Por favor abra la caja primero'
      });
    }

    let orderItems = [];
    let subtotal = 0;
    let totalCost = 0;

    // Procesar cada item
    for (const item of items) {
      const product = await Product.findById(item.productId).populate('comboItems.product');
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Producto no encontrado`
        });
      }

      if (!product.active) {
        return res.status(400).json({
          success: false,
          message: `Producto ${product.name} no está activo`
        });
      }

      // ========== MANEJO DE COMBOS ==========
      if (product.isCombo && product.comboItems && product.comboItems.length > 0) {
        
        // Calcular stock disponible del combo
        let minComboStock = Infinity;
        
        for (const comboItem of product.comboItems) {
          const comboProduct = await Product.findById(comboItem.product._id || comboItem.product);
          
          if (!comboProduct) {
            return res.status(404).json({
              success: false,
              message: `Producto del combo no encontrado: ${comboItem.productName}`
            });
          }
          
          const availableForThisItem = Math.floor(comboProduct.stock / comboItem.quantity);
          minComboStock = Math.min(minComboStock, availableForThisItem);
        }
        
        const comboStock = minComboStock === Infinity ? 0 : minComboStock;
        
        // Verificar si hay suficiente stock del combo
        if (comboStock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Stock insuficiente del combo ${product.name}. Disponible: ${comboStock}, Solicitado: ${item.quantity}`
          });
        }

        // Descontar stock de cada producto del combo
        for (const comboItem of product.comboItems) {
          const comboProduct = await Product.findById(comboItem.product._id || comboItem.product);
          
          if (comboProduct) {
            const requiredStock = comboItem.quantity * item.quantity;
            
            if (comboProduct.stock < requiredStock) {
              return res.status(400).json({
                success: false,
                message: `Stock insuficiente de ${comboProduct.name} para el combo. Disponible: ${comboProduct.stock}, Requerido: ${requiredStock}`
              });
            }
            
            comboProduct.stock -= requiredStock;
            await comboProduct.save();
          }
        }

        // Agregar combo a la orden
        const itemSubtotal = product.price * item.quantity;
        const itemCost = product.cost * item.quantity;

        orderItems.push({
          product: product._id,
          productName: product.name + ' (Combo)',
          quantity: item.quantity,
          unitPrice: product.price,
          unitCost: product.cost,
          subtotal: itemSubtotal
        });

        subtotal += itemSubtotal;
        totalCost += itemCost;

      } else {
        // ========== PRODUCTO NORMAL ==========
        
        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`
          });
        }

        const itemSubtotal = product.price * item.quantity;
        const itemCost = product.cost * item.quantity;

        orderItems.push({
          product: product._id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
          unitCost: product.cost,
          subtotal: itemSubtotal
        });

        subtotal += itemSubtotal;
        totalCost += itemCost;

        // Descontar stock
        product.stock -= item.quantity;
        await product.save();
      }
    }

    const total = subtotal - discount;

    // Generar número de orden y QR
    const orderNumber = await Order.generateOrderNumber();
    const qrCode = await QRCode.toDataURL(orderNumber);

    // Crear orden
    const order = await Order.create({
      orderNumber,
      qrCode,
      items: orderItems,
      subtotal,
      discount,
      total,
      totalCost,
      paymentMethod,
      cashRegister: openCashRegister._id,
      cashier: req.user.id,
      cashierName: req.user.name,
      notes,
      status: 'paid'
    });

    // Crear asiento contable
    await createSaleAccountingEntry(order, req.user);

    // Actualizar caja
    await openCashRegister.calculateTotals();
    await openCashRegister.save();

    // Obtener orden completa
    const fullOrder = await Order.findById(order._id)
      .populate('items.product', 'name');

    res.status(201).json({
      success: true,
      message: 'Orden creada exitosamente',
      order: fullOrder
    });

  } catch (error) {
    console.error('Error creando orden:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al crear orden: ' + error.message
    });
  }
});

// @route   GET /api/orders/validate/:orderNumber
// @desc    Validar orden por número (BARRA)
// @access  Private
router.get('/validate/:orderNumber', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      orderNumber: req.params.orderNumber 
    }).populate('items.product', 'name');

    if (!order) {
      return res.json({
        success: true,
        valid: false,
        status: 'not_found',
        message: '⚠️ ORDEN NO EXISTE',
        color: 'yellow'
      });
    }

    if (order.status === 'cancelled') {
      return res.json({
        success: true,
        valid: false,
        status: 'cancelled',
        message: '❌ ORDEN CANCELADA',
        color: 'red',
        order
      });
    }

    if (order.status === 'delivered') {
      return res.json({
        success: true,
        valid: false,
        status: 'delivered',
        message: '❌ YA ENTREGADA',
        color: 'red',
        order
      });
    }

    if (order.status === 'paid') {
      return res.json({
        success: true,
        valid: true,
        status: 'valid',
        message: '✅ ORDEN VÁLIDA',
        color: 'green',
        order
      });
    }

    res.json({
      success: true,
      valid: false,
      status: 'unknown',
      message: '⚠️ ESTADO DESCONOCIDO',
      color: 'yellow',
      order
    });
  } catch (error) {
    console.error('Error validando orden:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar orden'
    });
  }
});

// @route   PUT /api/orders/:orderNumber/deliver
// @desc    Marcar orden como entregada
// @access  Private
router.put('/:orderNumber/deliver', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      orderNumber: req.params.orderNumber 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    if (order.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'La orden no está en estado válido para entregar'
      });
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.deliveredBy = req.user.id;
    await order.save();

    res.json({
      success: true,
      message: 'Orden marcada como entregada',
      order
    });
  } catch (error) {
    console.error('Error entregando orden:', error);
    res.status(500).json({
      success: false,
      message: 'Error al entregar orden'
    });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancelar orden (Nota de Crédito)
// @access  Private (Admin)
router.put('/:id/cancel', auth, validateRole('admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'La orden ya está cancelada'
      });
    }

    // Devolver stock - verificar si son combos
    for (const item of order.items) {
      const product = await Product.findById(item.product).populate('comboItems.product');
      
      if (product) {
        if (product.isCombo && product.comboItems && product.comboItems.length > 0) {
          // Devolver stock de productos del combo
          for (const comboItem of product.comboItems) {
            const comboProduct = await Product.findById(comboItem.product._id || comboItem.product);
            if (comboProduct) {
              comboProduct.stock += comboItem.quantity * item.quantity;
              await comboProduct.save();
            }
          }
        } else {
          // Producto normal
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user.id;
    order.cancellationReason = reason;
    await order.save();

    // Crear asiento contable de reversa
    await createCancellationAccountingEntry(order, req.user);

    // Actualizar caja
    const cashRegister = await CashRegister.findById(order.cashRegister);
    if (cashRegister && cashRegister.status === 'open') {
      await cashRegister.calculateTotals();
      await cashRegister.save();
    }

    res.json({
      success: true,
      message: 'Orden cancelada exitosamente (Nota de Crédito emitida)',
      order
    });
  } catch (error) {
    console.error('Error cancelando orden:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar orden'
    });
  }
});

// ========== FUNCIONES AUXILIARES ==========

async function createSaleAccountingEntry(order, user) {
  try {
    const entryNumber = await AccountingEntry.generateEntryNumber();
    
    const lines = [
      {
        accountCode: order.paymentMethod === 'cash' ? '1.1.01' : '1.1.02',
        accountName: order.paymentMethod === 'cash' ? 'CAJA' : 'BANCOS',
        debit: order.total,
        credit: 0
      },
      {
        accountCode: '4.1.01',
        accountName: 'VENTAS',
        debit: 0,
        credit: order.total
      },
      {
        accountCode: '5.1.01',
        accountName: 'COSTO DE VENTAS',
        debit: order.totalCost,
        credit: 0
      },
      {
        accountCode: '1.1.03',
        accountName: 'INVENTARIOS',
        debit: 0,
        credit: order.totalCost
      }
    ];

    await AccountingEntry.create({
      entryNumber,
      date: new Date(),
      description: `Venta - Orden ${order.orderNumber}`,
      type: 'sale',
      lines,
      totalDebit: order.total + order.totalCost,
      totalCredit: order.total + order.totalCost,
      referenceType: 'order',
      referenceId: order._id,
      createdBy: user.id,
      createdByName: user.name
    });
  } catch (error) {
    console.error('Error creando asiento contable de venta:', error);
  }
}

async function createCancellationAccountingEntry(order, user) {
  try {
    const entryNumber = await AccountingEntry.generateEntryNumber();
    
    const lines = [
      {
        accountCode: order.paymentMethod === 'cash' ? '1.1.01' : '1.1.02',
        accountName: order.paymentMethod === 'cash' ? 'CAJA' : 'BANCOS',
        debit: 0,
        credit: order.total
      },
      {
        accountCode: '4.1.01',
        accountName: 'VENTAS',
        debit: order.total,
        credit: 0
      },
      {
        accountCode: '5.1.01',
        accountName: 'COSTO DE VENTAS',
        debit: 0,
        credit: order.totalCost
      },
      {
        accountCode: '1.1.03',
        accountName: 'INVENTARIOS',
        debit: order.totalCost,
        credit: 0
      }
    ];

    await AccountingEntry.create({
      entryNumber,
      date: new Date(),
      description: `Nota de Crédito - Orden ${order.orderNumber}`,
      type: 'sale',
      lines,
      totalDebit: order.total + order.totalCost,
      totalCredit: order.total + order.totalCost,
      referenceType: 'order',
      referenceId: order._id,
      createdBy: user.id,
      createdByName: user.name
    });
  } catch (error) {
    console.error('Error creando asiento contable de cancelación:', error);
  }
}

module.exports = router;