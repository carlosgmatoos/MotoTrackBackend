const express = require('express');
const notificacionRouter = express.Router();
const notificacionController = require('../controllers/notificacionController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Rutas para notificaciones
notificacionRouter.get('/notificaciones', authMiddleware, notificacionController.obtenerMisNotificaciones);
notificacionRouter.put('/notificaciones/leer', authMiddleware, notificacionController.marcarComoLeida);
notificacionRouter.delete('/notificaciones', authMiddleware, notificacionController.eliminarNotificacion);

module.exports = notificacionRouter; 