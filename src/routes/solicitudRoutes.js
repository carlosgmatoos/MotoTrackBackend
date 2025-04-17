const express = require('express');
const solicitudRouter = express.Router();
const solicitudController = require('../controllers/solicitudController');
const { authMiddleware, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');
const solicitudValidationMiddleware = require('../middlewares/solicitudValidationMiddleware');
const { validateSolicitudFiles, normalizeYearField } = require('../middlewares/uploadValidationMiddleware');
const multer = require('multer');

// Configuración de multer para guardar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fieldSize: 5 * 1024 * 1024 
  }
});

// Definición de los campos de archivos a subir
const solicitudDocumentosField = [
  { name: 'cedula', maxCount: 1 },
  { name: 'licencia', maxCount: 1 },
  { name: 'seguro_doc', maxCount: 1 },
  { name: 'factura', maxCount: 1 }
];

// Rutas para ciudadanos
solicitudRouter.post('/solicitud/crear', 
  authMiddleware, 
  upload.fields(solicitudDocumentosField),
  normalizeYearField,
  validateSolicitudFiles,
  solicitudValidationMiddleware.validateSolicitudCreation, 
  solicitudController.crearSolicitud
);

solicitudRouter.get('/solicitud/mis-solicitudes', 
  authMiddleware, 
  solicitudController.obtenerSolicitudesCiudadano
);

// Ruta para obtener una solicitud específica por su ID
solicitudRouter.get('/solicitud/:id', 
  authMiddleware, 
  solicitudController.obtenerSolicitudPorId
);

// Rutas para empleados
solicitudRouter.get('/solicitud/empleado/todas', 
  [authMiddleware, isEmpleado], 
  solicitudController.obtenerSolicitudesEmpleado
);

solicitudRouter.put('/solicitud/procesar', 
  [authMiddleware, isEmpleado], 
  solicitudValidationMiddleware.validateProcesarSolicitud, 
  solicitudController.procesarSolicitud
);

// Rutas para administradores
solicitudRouter.get('/solicitud/admin/todas', 
  [authMiddleware, isAdmin], 
  solicitudController.obtenerTodasSolicitudes
);

solicitudRouter.put('/solicitud/asignar', 
  [authMiddleware, isAdmin], 
  solicitudValidationMiddleware.validateAsignarSolicitud, 
  solicitudController.asignarSolicitudEmpleado
);

module.exports = solicitudRouter; 