const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: __dirname + '/../.env' });

// Importar modelos
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-system';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Conectado: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error de conexión a MongoDB: ${err.message}`);
    process.exit(1);
  }
};

const migrateStock = async () => {
  try {
    console.log('Iniciando script de migración de stock...');

    // 1. Crear Bodegas por defecto si no existen
    let mainWarehouse = await Warehouse.findOne({ name: 'Bodega Principal' });
    if (!mainWarehouse) {
      mainWarehouse = await Warehouse.create({
        name: 'Bodega Principal',
        description: 'Bodega de almacenamiento primario.',
        isDefault: true,
        active: true
      });
      console.log('-> Bodega "Bodega Principal" creada.');
    }

    let kitchenWarehouse = await Warehouse.findOne({ name: 'Cocina' });
    if (!kitchenWarehouse) {
      await Warehouse.create({
        name: 'Cocina',
        description: 'Inventario disponible para la preparación y venta.',
        active: true
      });
      console.log('-> Bodega "Cocina" creada.');
    }

    // 2. Obtener todos los productos
    // Usamos .lean() para obtener objetos JS planos, asegurando que el campo 'stock' (si existe) esté presente
    const products = await Product.find({}).lean();
    let migratedCount = 0;
    let skippedCount = 0;

    console.log(`\nSe encontraron ${products.length} productos. Iniciando migración...`);

    // 3. Iterar y migrar stock
    for (const product of products) {
      // El campo 'stock' puede no existir en todos los documentos o ser 0
      if (product.stock && product.stock > 0) {
        // Verificar si ya existe un registro de inventario para este producto en la bodega principal
        const existingInventory = await Inventory.findOne({
          product: product._id,
          warehouse: mainWarehouse._id
        });

        if (!existingInventory) {
          await Inventory.create({
            product: product._id,
            warehouse: mainWarehouse._id,
            quantity: product.stock,
            lastUpdatedBy: null // O un ID de usuario admin si se desea
          });
          console.log(`  - Migrado: ${product.stock} unidades de "${product.name}" a "Bodega Principal".`);
          migratedCount++;
        } else {
          console.log(`  - Omitido: Ya existe inventario para "${product.name}" en "Bodega Principal".`);
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log('\n--- Resumen de la Migración ---');
    console.log(`✅ Productos migrados con éxito: ${migratedCount}`);
    console.log(`⏩ Productos omitidos (sin stock o ya existentes): ${skippedCount}`);
    console.log('---------------------------------');
    console.log('\nMigración completada.');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    // 4. Desconectar de la base de datos
    await mongoose.disconnect();
    console.log('Desconectado de la base de datos.');
  }
};

// Ejecutar el script
const run = async () => {
  await connectDB();
  await migrateStock();
  process.exit(0);
};

run();