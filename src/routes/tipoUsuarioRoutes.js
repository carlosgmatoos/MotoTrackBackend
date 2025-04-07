const express = require('express');
const tipoUsuarioController = require('../controllers/tipoUsuarioController');
const { authMiddleware, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');
const tipoUsuarioValidationMiddleware = require('../middlewares/tipoUsuarioValidationMiddleware');
const tipoUsuarioRouter = express.Router();

tipoUsuarioRouter.get('/tipoUsuario', [authMiddleware, isEmpleado], tipoUsuarioController.getAllTiposUsuario);
tipoUsuarioRouter.post('/tipoUsuario', [authMiddleware, isAdmin], tipoUsuarioValidationMiddleware.validateTipoUsuarioCreation, tipoUsuarioController.createTipoUsuario);
tipoUsuarioRouter.put('/tipoUsuario', [authMiddleware, isAdmin], tipoUsuarioValidationMiddleware.validateTipoUsuarioUpdate, tipoUsuarioController.updateTipoUsuario);
tipoUsuarioRouter.delete('/tipoUsuario', [authMiddleware, isAdmin], tipoUsuarioController.deleteTipoUsuario);

module.exports = tipoUsuarioRouter; 