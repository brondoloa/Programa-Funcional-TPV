const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    // Verificar si hay sesión activa
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Por favor inicie sesión'
      });
    }

    req.user = req.session.user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

module.exports = auth;