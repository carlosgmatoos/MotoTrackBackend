const express = require('express');
const matriculaRouter = express.Router();
const matriculaController = require('../controllers/matriculaController');
const { authMiddleware, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');

// Rutas para administradores y empleados
matriculaRouter.get('/matricula/todas', [authMiddleware, isAdmin], matriculaController.obtenerMatriculasCompletas);
matriculaRouter.get('/matricula/activas', [authMiddleware, isEmpleado, isAdmin], matriculaController.obtenerMatriculasActivas);

// Ruta para obtener matrículas del usuario autenticado
matriculaRouter.get('/matricula/mis-matriculas', authMiddleware, matriculaController.obtenerMatriculasUsuario);

module.exports = matriculaRouter; 