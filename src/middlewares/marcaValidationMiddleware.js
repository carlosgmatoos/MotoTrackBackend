const { validateMarcaData } = require('../utils/validators');

/**
 * Middleware para validar creación de marcas
 */
const validateMarcaCreation = (req, res, next) => {
  const { isValid, errors } = validateMarcaData(req.body);
  
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: errors.join(', ')
    });
  }
  
  next();
};

/**
 * Middleware para validar actualización de marcas
 */
const validateMarcaUpdate = (req, res, next) => {
  // Si no hay datos para actualizar
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: 'Debe proporcionar al menos un campo para actualizar'
    });
  }
  
  const { isValid, errors } = validateMarcaData(req.body);
  
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: errors.join(', ')
    });
  }
  
  next();
};

module.exports = {
  validateMarcaCreation,
  validateMarcaUpdate
}; 