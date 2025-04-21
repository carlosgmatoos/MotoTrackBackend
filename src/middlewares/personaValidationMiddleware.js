const { validatePersona, validatePersonaUpdate } = require('../utils/validators');

/**
 * Middleware para validar datos de creación de persona
 */
const validateCreatePersona = (req, res, next) => {
  
  const validation = validatePersona(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: validation.errors
    });
  }

  // Sanitización de datos
  if (req.body.nombres) req.body.nombres = req.body.nombres.trim();
  if (req.body.apellidos) req.body.apellidos = req.body.apellidos.trim();
  if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();
  
  next();
};

/**
 * Middleware para validar datos de actualización de persona
 */
const validateUpdatePersona = (req, res, next) => {
  
  const validation = validatePersonaUpdate(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: validation.errors
    });
  }
  
  // Sanitización de datos
  if (req.body.nombres) req.body.nombres = req.body.nombres.trim();
  if (req.body.apellidos) req.body.apellidos = req.body.apellidos.trim();
  if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();
  next();
};

// Exportación explícita del módulo
module.exports = {
  validateCreatePersona,
  validateUpdatePersona
};