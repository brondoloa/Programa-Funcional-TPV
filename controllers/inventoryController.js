const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Shift = require('../models/Shift');
const InventoryTransfer = require('../models/InventoryTransfer');
const Product = require('../models/Product');
const User = require('../models/User');

// === Warehouse Management ===

// @desc    Display list of all warehouses
// @route   GET /inventory/warehouses
exports.listWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find();
    res.render('inventory/warehouses', {
      title: 'Gestión de Bodegas',
      warehouses: warehouses
    });
  } catch (err) {
    console.error(err);
    // Render an error page or redirect with a message
    res.status(500).send('Error del servidor');
  }
};

// @desc    Show form to create a new warehouse
// @route   GET /inventory/warehouses/new
exports.createWarehouseForm = (req, res) => {
  res.render('inventory/warehouse-form', {
    title: 'Crear Nueva Bodega',
    warehouse: {} // Empty object for the form
  });
};

// @desc    Save a new warehouse to DB
// @route   POST /inventory/warehouses
exports.saveWarehouse = async (req, res) => {
  try {
    await Warehouse.create(req.body);
    res.redirect('/inventory/warehouses');
  } catch (err) {
    console.error(err);
    res.status(400).send('Error al crear la bodega');
  }
};

// @desc    Show form to edit a warehouse
// @route   GET /inventory/warehouses/:id/edit
exports.editWarehouseForm = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).send('Bodega no encontrada');
    }
    res.render('inventory/warehouse-form', {
      title: 'Editar Bodega',
      warehouse: warehouse
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error del servidor');
  }
};

// @desc    Update a warehouse in DB
// @route   POST /inventory/warehouses/:id
exports.updateWarehouse = async (req, res) => {
  try {
    await Warehouse.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    res.redirect('/inventory/warehouses');
  } catch (err) {
    console.error(err);
    res.status(400).send('Error al actualizar la bodega');
  }
};

// @desc    Delete a warehouse
// @route   POST /inventory/warehouses/:id/delete
exports.deleteWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) {
            return res.status(404).send('Bodega no encontrada');
        }

        // Prevent deletion if there is stock in this warehouse
        const stock = await Inventory.findOne({ warehouse: req.params.id });
        if (stock) {
            // You should add a proper flash message here
            return res.status(400).send('No se puede eliminar la bodega porque tiene stock asociado.');
        }

        await Warehouse.findByIdAndDelete(req.params.id);
        res.redirect('/inventory/warehouses');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};

// === Shift Management ===

// @desc    Display list of shifts and management page
// @route   GET /inventory/shifts
exports.listShifts = async (req, res) => {
    try {
        const shifts = await Shift.find()
            .populate('openedBy', 'name')
            .populate('closedBy', 'name')
            .sort({ openingTime: -1 });

        const openShift = await Shift.findOne({ status: 'open' }).populate('openedBy', 'name');

        res.render('inventory/shifts', {
            title: 'Gestión de Turnos',
            shifts: shifts,
            openShift: openShift
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Start a new shift
// @route   POST /inventory/shifts/start
exports.startShift = async (req, res) => {
    try {
        const openShift = await Shift.findOne({ status: 'open' });
        if (openShift) {
            // It's better to handle this with a flash message on the client side
            return res.status(400).send('Ya hay un turno abierto. Ciérrelo antes de iniciar uno nuevo.');
        }

        await Shift.create({
            openedBy: req.session.user._id // Assuming user is in session
        });

        res.redirect('/api/inventory/shifts');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Close an open shift
// @route   POST /inventory/shifts/:id/close
exports.closeShift = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            return res.status(404).send('Turno no encontrado.');
        }
        if (shift.status === 'closed') {
            return res.status(400).send('Este turno ya ha sido cerrado.');
        }

        shift.status = 'closed';
        shift.closingTime = Date.now();
        shift.closedBy = req.session.user._id; // Assuming user is in session
        await shift.save();

        res.redirect('/api/inventory/shifts');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};


// === Inventory Transfer Management ===

// @desc    Show form to create a new inventory transfer
// @route   GET /inventory/transfers/new
exports.createTransferForm = async (req, res) => {
    try {
        const openShift = await Shift.findOne({ status: 'open' });
        if (!openShift) {
            // Redirect or render with an error message
            return res.status(400).send('No hay un turno abierto. Por favor, inicie un turno para poder realizar transferencias.');
        }

        const warehouses = await Warehouse.find({ active: true });
        const products = await Product.find({ active: true }).sort({ name: 1 });

        res.render('inventory/transfer-form', {
            title: 'Crear Nueva Transferencia',
            warehouses,
            products
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Save a new inventory transfer
// @route   POST /inventory/transfers
exports.saveTransfer = async (req, res) => {
    try {
        const { fromWarehouse, toWarehouse, notes, items } = req.body;

        const openShift = await Shift.findOne({ status: 'open' });
        if (!openShift) {
            return res.status(400).send('No hay un turno abierto para registrar esta transferencia.');
        }

        if (!items || Object.keys(items).length === 0) {
            return res.status(400).send('Debe agregar al menos un producto a la transferencia.');
        }

        const formattedItems = Object.values(items);

        // Check for sufficient stock in the source warehouse
        for (const item of formattedItems) {
            const inventoryRecord = await Inventory.findOne({
                product: item.product,
                warehouse: fromWarehouse
            });

            if (!inventoryRecord || inventoryRecord.quantity < item.quantity) {
                return res.status(400).send(`Stock insuficiente para el producto: ${item.productName} en la bodega de origen.`);
            }
        }

        await InventoryTransfer.create({
            fromWarehouse,
            toWarehouse,
            shift: openShift._id,
            items: formattedItems,
            notes,
            requestedBy: req.session.user._id
        });

        res.redirect('/api/inventory/shifts'); // Or a new transfers list page
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};

// @desc    List all inventory transfers
// @route   GET /inventory/transfers
exports.listTransfers = async (req, res) => {
    try {
        const transfers = await InventoryTransfer.find()
            .populate('fromWarehouse', 'name')
            .populate('toWarehouse', 'name')
            .populate('requestedBy', 'name')
            .sort({ createdAt: -1 });

        res.render('inventory/transfers-list', {
            title: 'Transferencias de Inventario',
            transfers
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};

// @desc    View details of a single inventory transfer
// @route   GET /inventory/transfers/:id
exports.viewTransfer = async (req, res) => {
    try {
        const transfer = await InventoryTransfer.findById(req.params.id)
            .populate('fromWarehouse', 'name')
            .populate('toWarehouse', 'name')
            .populate('requestedBy', 'name')
            .populate('confirmedBy', 'name');

        if (!transfer) {
            return res.status(404).send('Transferencia no encontrada');
        }

        res.render('inventory/transfer-detail', {
            title: `Detalle de Transferencia ${transfer.transferId}`,
            transfer,
            user: req.session.user // Pass user to check role in the view
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Confirm an inventory transfer and update stock
// @route   POST /inventory/transfers/:id/confirm
exports.confirmTransfer = async (req, res) => {
    try {
        const transfer = await InventoryTransfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).send('Transferencia no encontrada.');
        }
        if (transfer.status !== 'pending') {
            return res.status(400).send('Esta transferencia no se puede confirmar porque no está pendiente.');
        }

        // Atomically update inventory for each item
        for (const item of transfer.items) {
            // Decrement from source warehouse
            await Inventory.findOneAndUpdate(
                { product: item.product, warehouse: transfer.fromWarehouse },
                { $inc: { quantity: -item.quantity } },
                { upsert: false } // Do not create if it doesn't exist
            );

            // Increment in destination warehouse
            await Inventory.findOneAndUpdate(
                { product: item.product, warehouse: transfer.toWarehouse },
                { $inc: { quantity: item.quantity } },
                { upsert: true, new: true } // Create if it doesn't exist
            );
        }

        // Update transfer status
        transfer.status = 'confirmed';
        transfer.confirmedBy = req.session.user._id;
        await transfer.save();

        res.redirect(`/api/inventory/transfers/${transfer._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor durante la confirmación.');
    }
};

// @desc    Display a comprehensive view of all inventory
// @route   GET /inventory/
exports.viewInventory = async (req, res) => {
    try {
        const warehouses = await Warehouse.find({ active: true }).sort({ name: 1 });

        // Eagerly load all inventory records
        const allInventory = await Inventory.find().populate('warehouse');

        // Fetch all products and structure the data
        const products = await Product.find({ active: true }).sort({ name: 1 }).lean();

        // Map inventory to each product
        for (let product of products) {
            product.inventory = allInventory.filter(inv => inv.product.toString() === product._id.toString());
        }

        res.render('inventory/inventory-view', {
            title: 'Vista de Inventario',
            warehouses,
            products
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};