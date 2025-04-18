const express = require('express');
const statisticsRouter = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { authMiddleware, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');

// Ruta para obtener estadísticas del sistema (solo administradores)
statisticsRouter.get('/statistics/dashboard', [authMiddleware, isAdmin], statisticsController.getSystemDashboard);

// Ruta para obtener estadísticas personales del ciudadano
statisticsRouter.get('/statistics/ciudadano', authMiddleware, statisticsController.getCiudadanoDashboard);

// Ruta para obtener estadísticas del empleado
statisticsRouter.get('/statistics/empleado', [authMiddleware, isEmpleado], statisticsController.getEmpleadoDashboard);

module.exports = statisticsRouter; 