const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @route   POST /api/auth/login
// @desc    Login de usuario
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporcione email y contraseña'
      });
    }

    // Buscar usuario
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si está activo
    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario desactivado'
      });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    // Crear sesión
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout de usuario
// @access  Private
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  });
});

// @route   GET /api/auth/me
// @desc    Obtener usuario actual
// @access  Private
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
  }

  res.json({
    success: true,
    user: req.session.user
  });
});

module.exports = router;