const { validateTipoPersona, validateTipoPersonaUpdate } = require('../utils/validators');

/**
 * Middleware para validar datos de creación de tipo persona
 */
const validateCreateTipoPersona = (req, res, next) => {
  const validation = validateTipoPersona(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: validation.errors
    });
  }
  
  req.body.descripcion = req.body.descripcion.trim();
  if (req.body.codigo) req.body.codigo = req.body.codigo.trim().toUpperCase();
  
  next();
};

/**
 * Middleware para validar datos de actualización de tipo persona
 */
const validateUpdateTipoPersona = (req, res, next) => {
  const validation = validateTipoPersonaUpdate(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: validation.errors
    });
  }

  if (req.body.descripcion) req.body.descripcion = req.body.descripcion.trim();
  if (req.body.codigo) req.body.codigo = req.body.codigo.trim().toUpperCase();
  
  next();
};

module.exports = {
  validateCreateTipoPersona,
  validateUpdateTipoPersona
};