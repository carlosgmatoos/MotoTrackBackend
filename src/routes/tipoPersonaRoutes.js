const express = require('express');
const tipoPersonaRouter = express.Router();
const tipoPersonaController = require('../controllers/tipoPersonaController');
const { validateCreateTipoPersona, validateUpdateTipoPersona } = require('../middlewares/tipoPersonaValidationMiddleware');
const { authMiddleware, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');

// Rutas públicas - Convertirlas a protegidas para mayor seguridad
tipoPersonaRouter.get('/tipoPersona', [authMiddleware, isEmpleado], tipoPersonaController.getTiposPersona);

// Rutas protegidas (solo admin)
tipoPersonaRouter.post('/tipoPersona', [authMiddleware, isAdmin, validateCreateTipoPersona], tipoPersonaController.createTipoPersona);
tipoPersonaRouter.put('/tipoPersona', [authMiddleware, isAdmin, validateUpdateTipoPersona], tipoPersonaController.updateTipoPersona);
tipoPersonaRouter.delete('/tipoPersona', [authMiddleware, isAdmin], tipoPersonaController.deleteTipoPersona);

module.exports = tipoPersonaRouter; 