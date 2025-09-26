const express = require('express');
const router = express.Router();
const CashRegister = require('../models/CashRegister');
const AccountingEntry = require('../models/AccountingEntry');
const auth = require('../middleware/auth');
const validateRole = require('../middleware/validateRole');

// @route   GET /api/cash-register/current
// @desc    Obtener caja actual del usuario
// @access  Private (Admin, Cashier)
router.get('/current', auth, validateRole('admin', 'cashier'), async (req, res) => {
  try {
    const cashRegister = await CashRegister.findOne({
      openedBy: req.user.id,
      status: 'open'
    });

    if (!cashRegister) {
      return res.json({
        success: true,
        cashRegister: null,
        message: 'No hay caja abierta'
      });
    }

    // Recalcular totales
    await cashRegister.calculateTotals();
    await cashRegister.save();

    res.json({
      success: true,
      cashRegister
    });
  } catch (error) {
    console.error('Error obteniendo caja actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener caja actual'
    });
  }
});

// @route   GET /api/cash-register/history
// @desc    Obtener historial de cajas
// @access  Private (Admin)
router.get('/history', auth, validateRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    let filter = {};
    
    if (startDate || endDate) {
      filter.openingDate = {};
      if (startDate) filter.openingDate.$gte = new Date(startDate);
      if (endDate) filter.openingDate.$lte = new Date(endDate);
    }
    
    if (userId) filter.openedBy = userId;

    const cashRegisters = await CashRegister.find(filter)
      .populate('openedBy', 'name')
      .populate('closedBy', 'name')
      .sort({ openingDate: -1 })
      .limit(50);

    res.json({
      success: true,
      cashRegisters
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial'
    });
  }
});

// @route   POST /api/cash-register/open
// @desc    Abrir caja
// @access  Private (Admin, Cashier)
router.post('/open', auth, validateRole('admin', 'cashier'), async (req, res) => {
  try {
    const { initialAmount, notes } = req.body;

    if (!initialAmount || initialAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto inicial es requerido y debe ser mayor o igual a 0'
      });
    }

    // Verificar si ya tiene una caja abierta
    const existingCashRegister = await CashRegister.findOne({
      openedBy: req.user.id,
      status: 'open'
    });

    if (existingCashRegister) {
      return res.status(400).json({
        success: false,
        message: 'Ya tiene una caja abierta'
      });
    }

    // Crear nueva caja
    const cashRegister = await CashRegister.create({
      initialAmount,
      openedBy: req.user.id,
      openedByName: req.user.name,
      notes
    });

    // Crear asiento contable de apertura
    const entryNumber = await AccountingEntry.generateEntryNumber();
    
    await AccountingEntry.create({
      entryNumber,
      date: new Date(),
      description: `Apertura de caja - Fondo inicial`,
      type: 'opening',
      lines: [
        {
          accountCode: '1.1.01',
          accountName: 'CAJA',
          debit: initialAmount,
          credit: 0
        },
        {
          accountCode: '3.1',
          accountName: 'CAPITAL',
          debit: 0,
          credit: initialAmount
        }
      ],
      totalDebit: initialAmount,
      totalCredit: initialAmount,
      referenceType: 'cash_register',
      referenceId: cashRegister._id,
      createdBy: req.user.id,
      createdByName: req.user.name
    });

    res.status(201).json({
      success: true,
      message: 'Caja abierta exitosamente',
      cashRegister
    });
  } catch (error) {
    console.error('Error abriendo caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al abrir caja'
    });
  }
});

// @route   POST /api/cash-register/close
// @desc    Cerrar caja
// @access  Private (Admin, Cashier)
router.post('/close', auth, validateRole('admin', 'cashier'), async (req, res) => {
  try {
    const { actualAmount, notes } = req.body;

    if (actualAmount === undefined || actualAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto real es requerido'
      });
    }

    // Buscar caja abierta
    const cashRegister = await CashRegister.findOne({
      openedBy: req.user.id,
      status: 'open'
    });

    if (!cashRegister) {
      return res.status(400).json({
        success: false,
        message: 'No hay caja abierta'
      });
    }

    // Calcular totales finales
    await cashRegister.calculateTotals();
    
    cashRegister.status = 'closed';
    cashRegister.closingDate = new Date();
    cashRegister.actualAmount = actualAmount;
    cashRegister.difference = actualAmount - cashRegister.expectedAmount;
    cashRegister.closedBy = req.user.id;
    cashRegister.closedByName = req.user.name;
    if (notes) cashRegister.notes = notes;
    
    await cashRegister.save();

    // Crear asiento contable de cierre (si hay diferencia)
    if (cashRegister.difference !== 0) {
      const entryNumber = await AccountingEntry.generateEntryNumber();
      const isDifferenceLoss = cashRegister.difference < 0;
      
      await AccountingEntry.create({
        entryNumber,
        date: new Date(),
        description: `Cierre de caja - ${isDifferenceLoss ? 'Faltante' : 'Sobrante'}`,
        type: 'closing',
        lines: [
          {
            accountCode: '1.1.01',
            accountName: 'CAJA',
            debit: isDifferenceLoss ? 0 : Math.abs(cashRegister.difference),
            credit: isDifferenceLoss ? Math.abs(cashRegister.difference) : 0
          },
          {
            accountCode: isDifferenceLoss ? '5.2.03' : '4.1.01',
            accountName: isDifferenceLoss ? 'OTROS GASTOS' : 'OTROS INGRESOS',
            debit: isDifferenceLoss ? Math.abs(cashRegister.difference) : 0,
            credit: isDifferenceLoss ? 0 : Math.abs(cashRegister.difference)
          }
        ],
        totalDebit: Math.abs(cashRegister.difference),
        totalCredit: Math.abs(cashRegister.difference),
        referenceType: 'cash_register',
        referenceId: cashRegister._id,
        createdBy: req.user.id,
        createdByName: req.user.name
      });
    }

    res.json({
      success: true,
      message: 'Caja cerrada exitosamente',
      cashRegister
    });
  } catch (error) {
    console.error('Error cerrando caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar caja'
    });
  }
});

// @route   GET /api/cash-register/:id
// @desc    Obtener detalles de una caja específica
// @access  Private (Admin)
router.get('/:id', auth, validateRole('admin'), async (req, res) => {
  try {
    const cashRegister = await CashRegister.findById(req.params.id)
      .populate('openedBy', 'name')
      .populate('closedBy', 'name');

    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Caja no encontrada'
      });
    }

    res.json({
      success: true,
      cashRegister
    });
  } catch (error) {
    console.error('Error obteniendo caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener caja'
    });
  }
});

module.exports = router;