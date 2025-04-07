/**
 * Maneja errores de forma consistente en las respuestas HTTP
 */
const handleError = (res, error, defaultMessage = 'Error en el servidor') => {
  console.error('Error:', error);
  
  // Determinar si es un error de base de datos
  if (error.code) {
    // Errores específicos de PostgreSQL
    switch (error.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          error: 'Conflicto de datos',
          message: 'Ya existe un registro con esos datos'
        });
      case '23503': // foreign_key_violation
        return res.status(400).json({
          success: false,
          error: 'Referencia inválida',
          message: 'La referencia a otro registro no es válida'
        });
      case '23502': // not_null_violation
        return res.status(400).json({
          success: false,
          error: 'Datos incompletos',
          message: 'Faltan campos obligatorios'
        });
      default:
        // Otros errores de base de datos
        return res.status(500).json({
          success: false,
          error: 'Error de base de datos',
          message: 'Error al procesar la solicitud en la base de datos'
        });
    }
  }
  
  // Error genérico
  return res.status(500).json({
    success: false,
    error: 'Error interno',
    message: defaultMessage
  });
};

module.exports = {
  handleError
}; 