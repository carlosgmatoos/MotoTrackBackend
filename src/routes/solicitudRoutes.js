const express = require('express');
const solicitudRouter = express.Router();
const solicitudController = require('../controllers/solicitudController');
const { authMiddleware, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');
const solicitudValidationMiddleware = require('../middlewares/solicitudValidationMiddleware');

// Rutas para ciudadanos
solicitudRouter.post('/solicitud/crear', authMiddleware, solicitudValidationMiddleware.validateSolicitudCreation, solicitudController.crearSolicitud);
solicitudRouter.get('/solicitud/mis-solicitudes', authMiddleware, solicitudController.obtenerSolicitudesCiudadano);

// Rutas para empleados
solicitudRouter.get('/solicitud/empleado/todas', [authMiddleware, isEmpleado], solicitudController.obtenerSolicitudesEmpleado);
solicitudRouter.put('/solicitud/procesar', [authMiddleware, isEmpleado], solicitudValidationMiddleware.validateProcesarSolicitud, solicitudController.procesarSolicitud);

// Rutas para administradores
solicitudRouter.get('/solicitud/admin/todas', [authMiddleware, isAdmin], solicitudController.obtenerTodasSolicitudes);
solicitudRouter.put('/solicitud/asignar', [authMiddleware, isAdmin], solicitudValidationMiddleware.validateAsignarSolicitud, solicitudController.asignarSolicitudEmpleado);

module.exports = solicitudRouter; 