const ALLOWED_FILE_TYPES = {
  'perfil': ['image/jpeg', 'image/png', 'image/jpg'],
  'cedula': ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  'licencia': ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  'seguro': ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  'factura': ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
};

const validateFileUpload = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo'
      });
    }

    const { fileType } = req.body;
    if (!fileType || !ALLOWED_FILE_TYPES[fileType]) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de archivo no válido'
      });
    }

    if (!ALLOWED_FILE_TYPES[fileType].includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de archivo no permitido para este tipo de documento'
      });
    }

    // Sanitizar nombre de archivo
    req.file.originalname = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateFileUpload
};
