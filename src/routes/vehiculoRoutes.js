const express = require('express');
const vehiculoRouter = express.Router();
const vehiculoController = require('../controllers/vehiculoController');
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware');
const vehiculoValidationMiddleware = require('../middlewares/vehiculoValidationMiddleware');

vehiculoRouter.get('/vehiculo', vehiculoController.getAllVehiculos);
vehiculoRouter.post('/vehiculo', [authMiddleware, isAdmin], vehiculoValidationMiddleware.validateVehiculoCreation, vehiculoController.createVehiculo);
vehiculoRouter.put('/vehiculo', [authMiddleware, isAdmin], vehiculoValidationMiddleware.validateVehiculoUpdate, vehiculoController.updateVehiculo);
vehiculoRouter.delete('/vehiculo', [authMiddleware, isAdmin], vehiculoController.deleteVehiculo);

module.exports = vehiculoRouter; 