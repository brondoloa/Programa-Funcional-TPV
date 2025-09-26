const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/auth');
const validateRole = require('../middleware/validateRole');

// === RUTAS DE GESTIÓN DE BODEGAS (Warehouses) ===
// Todas las rutas de bodegas son solo para administradores.
router.get('/warehouses', auth, validateRole('admin'), inventoryController.listWarehouses);
router.get('/warehouses/new', auth, validateRole('admin'), inventoryController.createWarehouseForm);
router.post('/warehouses', auth, validateRole('admin'), inventoryController.saveWarehouse);
router.get('/warehouses/:id/edit', auth, validateRole('admin'), inventoryController.editWarehouseForm);
router.post('/warehouses/:id', auth, validateRole('admin'), inventoryController.updateWarehouse);
router.post('/warehouses/:id/delete', auth, validateRole('admin'), inventoryController.deleteWarehouse);


// === RUTAS DE GESTIÓN DE TURNOS (Shifts) ===
// Todos los roles de inventario pueden ver los turnos.
router.get('/shifts', auth, validateRole('admin', 'bodega', 'cocina'), inventoryController.listShifts);

// Solo admin y bodega pueden iniciar/cerrar turnos.
router.post('/shifts/start', auth, validateRole('admin', 'bodega'), inventoryController.startShift);
router.post('/shifts/:id/close', auth, validateRole('admin', 'bodega'), inventoryController.closeShift);


// === RUTAS DE TRANSFERENCIAS DE INVENTARIO ===
// Solo admin y bodega pueden crear transferencias.
router.get('/transfers/new', auth, validateRole('admin', 'bodega'), inventoryController.createTransferForm);
router.post('/transfers', auth, validateRole('admin', 'bodega'), inventoryController.saveTransfer);

// Todos los roles de inventario pueden ver la lista y los detalles.
router.get('/transfers', auth, validateRole('admin', 'bodega', 'cocina'), inventoryController.listTransfers);
router.get('/transfers/:id', auth, validateRole('admin', 'bodega', 'cocina'), inventoryController.viewTransfer);

// Solo admin y cocina pueden confirmar la recepción.
router.post('/transfers/:id/confirm', auth, validateRole('admin', 'cocina'), inventoryController.confirmTransfer);


// === RUTAS DE VISUALIZACIÓN DE INVENTARIO ===
// Todos los roles de inventario pueden ver el inventario general.
router.get('/', auth, validateRole('admin', 'bodega', 'cocina'), inventoryController.viewInventory);


module.exports = router;