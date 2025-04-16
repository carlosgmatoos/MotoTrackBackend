// Manejador genérico de errores para respuestas HTTP

const handleError = (res, error, defaultMessage = 'Error interno del servidor') => {
  console.error(defaultMessage + ':', error);
  
  // Si es un error de base de datos o un error específico, proporcionar más información
  const errorDetail = error.message || error.toString();
  const errorCode = error.code || '';
  
  return res.status(500).json({
    success: false,
    error: defaultMessage,
    message: errorDetail,
    code: errorCode,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

module.exports = {
  handleError
}; 