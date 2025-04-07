const express = require('express');
const ubicacionRouter = express.Router();
const ubicacionController = require('../controllers/ubicacionController');
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware');
const ubicacionValidationMiddleware = require('../middlewares/ubicacionValidationMiddleware');

ubicacionRouter.get('/ubicacion', ubicacionController.getAllUbicaciones);
ubicacionRouter.post('/ubicacion', authMiddleware, ubicacionValidationMiddleware.validateUbicacionCreation, ubicacionController.createUbicacion);
ubicacionRouter.put('/ubicacion', authMiddleware, ubicacionValidationMiddleware.validateUbicacionUpdate, ubicacionController.updateUbicacion);
ubicacionRouter.delete('/ubicacion', [authMiddleware, isAdmin], ubicacionController.deleteUbicacion);

module.exports = ubicacionRouter; 