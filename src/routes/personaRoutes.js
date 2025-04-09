const express = require('express');
const personaRouter = express.Router();
const personaController = require('../controllers/personaController');
const personaValidation = require('../middlewares/personaValidationMiddleware');
const { authMiddleware, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');

// Rutas para el perfil personal del usuario autenticado
personaRouter.get('/perfil', authMiddleware, personaController.getOwnProfile);
personaRouter.post('/persona', [authMiddleware, personaValidation.validateCreatePersona], personaController.createPersona);
personaRouter.put('/persona', [authMiddleware, personaValidation.validateUpdatePersona], personaController.updatePersona);

// Rutas protegidas (empleados y admin)
personaRouter.get('/persona', [authMiddleware, isEmpleado], personaController.getPersonas);

// Rutas protegidas (solo admin)
personaRouter.delete('/persona', [authMiddleware, isAdmin], personaController.deletePersona);

personaRouter.get('/persona/empleados', [authMiddleware, isAdmin], personaController.getEmpleados);

module.exports = personaRouter; 