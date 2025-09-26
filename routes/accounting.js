const express = require('express');
const router = express.Router();
const AccountingEntry = require('../models/AccountingEntry');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const validateRole = require('../middleware/validateRole');
const config = require('../config/config');

// @route   GET /api/accounting/entries
// @desc    Obtener asientos contables
// @access  Private (Admin, Accountant)
router.get('/entries', auth, validateRole('admin', 'accountant'), async (req, res) => {
  try {
    const { startDate, endDate, type, status } = req.query;
    
    let filter = {};
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    
    if (type) filter.type = type;
    if (status) filter.status = status;

    const entries = await AccountingEntry.find(filter)
      .sort({ date: -1, entryNumber: -1 })
      .limit(500);

    res.json({
      success: true,
      entries
    });
  } catch (error) {
    console.error('Error obteniendo asientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asientos contables'
    });
  }
});

// @route   GET /api/accounting/entries/:id
// @desc    Obtener detalle de un asiento
// @access  Private (Admin, Accountant)
router.get('/entries/:id', auth, validateRole('admin', 'accountant'), async (req, res) => {
  try {
    const entry = await AccountingEntry.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Asiento no encontrado'
      });
    }

    res.json({
      success: true,
      entry
    });
  } catch (error) {
    console.error('Error obteniendo asiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asiento'
    });
  }
});

// @route   GET /api/accounting/chart-of-accounts
// @desc    Obtener plan de cuentas
// @access  Private (Admin, Accountant)
router.get('/chart-of-accounts', auth, validateRole('admin', 'accountant'), async (req, res) => {
  try {
    res.json({
      success: true,
      accounts: config.chartOfAccounts
    });
  } catch (error) {
    console.error('Error obteniendo plan de cuentas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener plan de cuentas'
    });
  }
});

// @route   GET /api/accounting/income-statement
// @desc    Estado de Resultados (P&L)
// @access  Private (Admin, Accountant)
router.get('/income-statement', auth, validateRole('admin', 'accountant'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = { status: 'active' };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const entries = await AccountingEntry.find(filter);

    let sales = 0;
    let costOfSales = 0;
    let operatingExpenses = 0;

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountCode.startsWith('4')) {
          sales += line.credit - line.debit;
        }
        if (line.accountCode.startsWith('5.1')) {
          costOfSales += line.debit - line.credit;
        }
        if (line.accountCode.startsWith('5.2')) {
          operatingExpenses += line.debit - line.credit;
        }
      });
    });

    const grossProfit = sales - costOfSales;
    const netIncome = grossProfit - operatingExpenses;
    const grossMargin = sales > 0 ? (grossProfit / sales * 100).toFixed(2) : 0;
    const netMargin = sales > 0 ? (netIncome / sales * 100).toFixed(2) : 0;

    res.json({
      success: true,
      incomeStatement: {
        sales: sales.toFixed(0),
        costOfSales: costOfSales.toFixed(0),
        grossProfit: grossProfit.toFixed(0),
        grossMargin: `${grossMargin}%`,
        operatingExpenses: operatingExpenses.toFixed(0),
        netIncome: netIncome.toFixed(0),
        netMargin: `${netMargin}%`
      }
    });
  } catch (error) {
    console.error('Error generando estado de resultados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar estado de resultados'
    });
  }
});

// @route   GET /api/accounting/balance-sheet
// @desc    Balance General
// @access  Private (Admin, Accountant)
router.get('/balance-sheet', auth, validateRole('admin', 'accountant'), async (req, res) => {
  try {
    const { date } = req.query;
    
    const filter = { 
      status: 'active',
      date: { $lte: date ? new Date(date) : new Date() }
    };

    const entries = await AccountingEntry.find(filter);

    let assets = 0;
    let cashAndBanks = 0;
    let inventory = 0;
    let liabilities = 0;
    let accountsPayable = 0;
    let equity = 0;

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountCode.startsWith('1')) {
          const amount = line.debit - line.credit;
          assets += amount;
          if (line.accountCode.startsWith('1.1.01') || line.accountCode.startsWith('1.1.02')) {
            cashAndBanks += amount;
          }
          if (line.accountCode.startsWith('1.1.03')) {
            inventory += amount;
          }
        }
        if (line.accountCode.startsWith('2')) {
          const amount = line.credit - line.debit;
          liabilities += amount;
          if (line.accountCode.startsWith('2.1.01')) {
            accountsPayable += amount;
          }
        }
        if (line.accountCode.startsWith('3')) {
          equity += line.credit - line.debit;
        }
      });
    });

    res.json({
      success: true,
      balanceSheet: {
        assets: assets.toFixed(0),
        cashAndBanks: cashAndBanks.toFixed(0),
        inventory: inventory.toFixed(0),
        liabilities: liabilities.toFixed(0),
        accountsPayable: accountsPayable.toFixed(0),
        equity: equity.toFixed(0),
        total: (liabilities + equity).toFixed(0),
        balanced: Math.abs(assets - (liabilities + equity)) < 1
      }
    });
  } catch (error) {
    console.error('Error generando balance general:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar balance general'
    });
  }
});

// @route   GET /api/accounting/cash-flow
// @desc    Flujo de Efectivo
// @access  Private (Admin, Accountant)
router.get('/cash-flow', auth, validateRole('admin', 'accountant'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = { status: 'active' };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const entries = await AccountingEntry.find(filter);

    let cashInflows = 0;
    let cashOutflows = 0;

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountCode === '1.1.01') {
          cashInflows += line.debit;
          cashOutflows += line.credit;
        }
      });
    });

    const netCashFlow = cashInflows - cashOutflows;

    res.json({
      success: true,
      cashFlow: {
        cashInflows: cashInflows.toFixed(0),
        cashOutflows: cashOutflows.toFixed(0),
        netCashFlow: netCashFlow.toFixed(0)
      }
    });
  } catch (error) {
    console.error('Error generando flujo de efectivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar flujo de efectivo'
    });
  }
});

// @route   GET /api/accounting/sales-ledger
// @desc    Libro de Ventas
// @access  Private (Admin, Accountant)
router.get('/sales-ledger', auth, validateRole('admin', 'accountant'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = { status: { $ne: 'cancelled' } };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .select('orderNumber createdAt total paymentMethod cashierName')
      .sort({ createdAt: -1 });

    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);

    res.json({
      success: true,
      salesLedger: orders,
      summary: {
        totalOrders: orders.length,
        totalSales: totalSales.toFixed(0)
      }
    });
  } catch (error) {
    console.error('Error generando libro de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar libro de ventas'
    });
  }
});

// @route   POST /api/accounting/entries
// @desc    Crear asiento contable manual
// @access  Private (Admin, Accountant)
router.post('/entries', auth, validateRole('admin', 'accountant'), async (req, res) => {
  try {
    const { description, lines } = req.body;

    if (!description || !lines || lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere descripción y al menos 2 líneas contables'
      });
    }

    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'El total de débitos debe ser igual al total de créditos'
      });
    }

    const entryNumber = await AccountingEntry.generateEntryNumber();

    const entry = await AccountingEntry.create({
      entryNumber,
      date: new Date(),
      description,
      type: 'manual',
      lines,
      totalDebit,
      totalCredit,
      referenceType: 'manual',
      createdBy: req.user.id,
      createdByName: req.user.name
    });

    res.status(201).json({
      success: true,
      message: 'Asiento contable creado exitosamente',
      entry
    });
  } catch (error) {
    console.error('Error creando asiento contable:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear asiento contable'
    });
  }
});

module.exports = router;