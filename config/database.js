const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ MongoDB conectado exitosamente');
    await createDefaultAdmin();
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

const createDefaultAdmin = async () => {
  try {
    const User = require('../models/User');
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 10);
      
      await User.create({
        name: 'Administrador',
        email: process.env.ADMIN_EMAIL || 'admin@restaurant.com',
        password: hashedPassword,
        role: 'admin',
        active: true
      });
      
      console.log('✅ Usuario administrador creado');
    }
  } catch (error) {
    console.error('Error creando administrador:', error.message);
  }
};

module.exports = connectDB;