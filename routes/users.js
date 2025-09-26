const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const validateRole = require('../middleware/validateRole');

// @route   GET /api/users
// @desc    Obtener todos los usuarios
// @access  Private (Admin)
router.get('/', auth, validateRole('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
});

// @route   POST /api/users
// @desc    Crear nuevo usuario
// @access  Private (Admin)
router.post('/', auth, validateRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validaciones
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Actualizar usuario
// @access  Private (Admin)
router.put('/:id', auth, validateRole('admin'), async (req, res) => {
  try {
    const { name, email, role, active } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar campos
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role) user.role = role;
    if (typeof active !== 'undefined') user.active = active;

    await user.save();

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active
      }
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario'
    });
  }
});

// @route   PUT /api/users/:id/password
// @desc    Cambiar contraseña
// @access  Private (Admin)
router.put('/:id/password', auth, validateRole('admin'), async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Eliminar usuario
// @access  Private (Admin)
router.delete('/:id', auth, validateRole('admin'), async (req, res) => {
  try {
    // No permitir eliminar al mismo usuario
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propio usuario'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario'
    });
  }
});

module.exports = router;