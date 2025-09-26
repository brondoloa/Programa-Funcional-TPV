module.exports = {
  // Roles del sistema
  roles: {
    ADMIN: 'admin',
    CASHIER: 'cashier',
    ACCOUNTANT: 'accountant'
  },
  
  // Estados de órdenes
  orderStatus: {
    PAID: 'paid',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  },
  
  // Métodos de pago
  paymentMethods: {
    CASH: 'cash',
    CARD: 'card',
    TRANSFER: 'transfer'
  },
  
  // Estados de caja
  cashRegisterStatus: {
    OPEN: 'open',
    CLOSED: 'closed'
  },
  
  // Tipos de cuentas contables
  accountTypes: {
    ASSET: 'asset',
    LIABILITY: 'liability',
    EQUITY: 'equity',
    INCOME: 'income',
    EXPENSE: 'expense'
  },
  
  // Plan de cuentas predefinido
  chartOfAccounts: [
    // ACTIVOS
    { code: '1', name: 'ACTIVOS', type: 'asset', parent: null },
    { code: '1.1', name: 'ACTIVO CORRIENTE', type: 'asset', parent: '1' },
    { code: '1.1.01', name: 'CAJA', type: 'asset', parent: '1.1' },
    { code: '1.1.02', name: 'BANCOS', type: 'asset', parent: '1.1' },
    { code: '1.1.03', name: 'INVENTARIOS', type: 'asset', parent: '1.1' },
    
    // PASIVOS
    { code: '2', name: 'PASIVOS', type: 'liability', parent: null },
    { code: '2.1', name: 'PASIVO CORRIENTE', type: 'liability', parent: '2' },
    { code: '2.1.01', name: 'CUENTAS POR PAGAR', type: 'liability', parent: '2.1' },
    
    // PATRIMONIO
    { code: '3', name: 'PATRIMONIO', type: 'equity', parent: null },
    { code: '3.1', name: 'CAPITAL', type: 'equity', parent: '3' },
    { code: '3.2', name: 'UTILIDADES RETENIDAS', type: 'equity', parent: '3' },
    { code: '3.3', name: 'UTILIDAD DEL EJERCICIO', type: 'equity', parent: '3' },
    
    // INGRESOS
    { code: '4', name: 'INGRESOS', type: 'income', parent: null },
    { code: '4.1', name: 'VENTAS', type: 'income', parent: '4' },
    { code: '4.1.01', name: 'VENTAS DE ALIMENTOS', type: 'income', parent: '4.1' },
    { code: '4.1.02', name: 'VENTAS DE BEBIDAS', type: 'income', parent: '4.1' },
    
    // GASTOS
    { code: '5', name: 'GASTOS', type: 'expense', parent: null },
    { code: '5.1', name: 'COSTO DE VENTAS', type: 'expense', parent: '5' },
    { code: '5.1.01', name: 'COSTO DE ALIMENTOS', type: 'expense', parent: '5.1' },
    { code: '5.1.02', name: 'COSTO DE BEBIDAS', type: 'expense', parent: '5.1' },
    { code: '5.2', name: 'GASTOS OPERACIONALES', type: 'expense', parent: '5' },
    { code: '5.2.01', name: 'SUELDOS Y SALARIOS', type: 'expense', parent: '5.2' },
    { code: '5.2.02', name: 'SERVICIOS BÁSICOS', type: 'expense', parent: '5.2' },
    { code: '5.2.03', name: 'MANTENIMIENTO', type: 'expense', parent: '5.2' }
  ]
};