const { validatePersona, validatePersonaUpdate } = require('../utils/validators');

/**
 * Middleware para validar datos de creación de persona
 */
const validateCreatePersona = (req, res, next) => {
  console.log('Middleware validateCreatePersona ejecutándose');
  console.log('Body recibido:', req.body);
  
  const validation = validatePersona(req.body);
  
  if (!validation.isValid) {
    console.log('Validación fallida:', validation.errors);
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
  
  console.log('Validación exitosa, continuando');
  next();
};

/**
 * Middleware para validar datos de actualización de persona
 */
const validateUpdatePersona = (req, res, next) => {
  console.log('Middleware validateUpdatePersona ejecutándose');
  console.log('Body recibido:', req.body);
  console.log('Params recibidos:', req.params);
  
  const validation = validatePersonaUpdate(req.body);
  
  if (!validation.isValid) {
    console.log('Validación fallida:', validation.errors);
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
  
  console.log('Validación exitosa, continuando');
  next();
};

// Exportación explícita del módulo
module.exports = {
  validateCreatePersona,
  validateUpdatePersona
};