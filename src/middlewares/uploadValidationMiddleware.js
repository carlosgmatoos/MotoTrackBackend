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

/**
 * Validar archivos para solicitud
 */
const validateSolicitudFiles = (req, res, next) => {
  try {
    // Validar que los archivos requeridos estén presentes
    if (!req.files) {
      return res.status(400).json({
        success: false,
        error: 'Archivos requeridos',
        message: 'No se enviaron los archivos requeridos'
      });
    }

    // Validar que los documentos obligatorios estén presentes
    const requiredDocs = ['cedula', 'licencia', 'factura'];
    const missingDocs = requiredDocs.filter(doc => !req.files[doc] || req.files[doc].length === 0);
    
    if (missingDocs.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Documentos obligatorios',
        message: `Los siguientes documentos son obligatorios: ${missingDocs.join(', ')}`
      });
    }

    // El documento de seguro es opcional

    // Preprocesar campos específicos de la solicitud
    if (req.body) {
      // Procesar campos que puedan venir como string
      Object.keys(req.body).forEach(key => {
        // Convertir los objetos JSON que vienen como strings
        try {
          if (typeof req.body[key] === 'string' && 
             (req.body[key].startsWith('{') || req.body[key].startsWith('['))) {
            req.body[key] = JSON.parse(req.body[key]);
          }
        } catch (e) {
          // Si falla el parseo JSON, mantener el valor original
        }
      });
      
      // Procesar "año" o "ano" específicamente
      if (req.body.ano && !req.body.año) {
        req.body.año = parseInt(req.body.ano, 10);
      } else if (req.body.año && typeof req.body.año === 'string') {
        req.body.año = parseInt(req.body.año, 10);
      }

      // Procesar seguro si se proporciona
      if (typeof req.body.datoSeguro === 'string') {
        try {
          req.body.datoSeguro = JSON.parse(req.body.datoSeguro);
        } catch (e) {
          // Ignorar error de parseo
        }
      }
      
      if (typeof req.body.seguro === 'string') {
        try {
          req.body.seguro = JSON.parse(req.body.seguro);
        } catch (e) {
          // Ignorar error de parseo
        }
      }

      // Procesar persona si se proporciona como string JSON
      if (typeof req.body.persona === 'string') {
        try {
          req.body.persona = JSON.parse(req.body.persona);
        } catch (e) {
          // Ignorar error de parseo
        }
      }
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error al validar archivos',
      message: error.message
    });
  }
};

// Middleware para normalizar los campos de "año" en todas sus variantes
const normalizeYearField = (req, res, next) => {
  try {
    if (req.body) {
      // Transferir cualquier variante de "año" a "ano"
      if (req.body['año'] !== undefined) {
        req.body.ano = req.body['año'];
        delete req.body['año'];
      }
      
      // Transferir con problemas de codificación
      if (req.body['aÃ±o'] !== undefined) {
        req.body.ano = req.body['aÃ±o'];
        delete req.body['aÃ±o'];
      }
      
      // Asegurarse de que ano sea un número
      if (req.body.ano !== undefined) {
        const anoString = String(req.body.ano);
        req.body.ano = parseInt(anoString, 10);
      }
      
      // Procesar el campo seguro
      if (req.body.seguro) {
        if (typeof req.body.seguro === 'string') {
          try {
            req.body.seguro = JSON.parse(req.body.seguro);
          } catch (error) {
            // Ignorar error de parseo
          }
        }
      }
      
      // Procesar el campo persona
      if (req.body.persona) {
        if (typeof req.body.persona === 'string') {
          try {
            req.body.persona = JSON.parse(req.body.persona);
          } catch (error) {
            // Ignorar error de parseo
          }
        }
      }
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error al normalizar campos',
      message: error.message
    });
  }
};

module.exports = {
  validateFileUpload,
  validateSolicitudFiles,
  normalizeYearField
};
