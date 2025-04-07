const express = require('express');
const tipoVehiculoRouter = express.Router();
const tipoVehiculoController = require('../controllers/tipoVehiculoController');
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware');
const tipoVehiculoValidationMiddleware = require('../middlewares/tipoVehiculoValidationMiddleware');

tipoVehiculoRouter.get('/tipovehiculo', tipoVehiculoController.getAllTiposVehiculo);
tipoVehiculoRouter.post('/tipovehiculo', [authMiddleware, isAdmin], tipoVehiculoValidationMiddleware.validateTipoVehiculoCreation, tipoVehiculoController.createTipoVehiculo);
tipoVehiculoRouter.put('/tipovehiculo', [authMiddleware, isAdmin], tipoVehiculoValidationMiddleware.validateTipoVehiculoUpdate, tipoVehiculoController.updateTipoVehiculo);
tipoVehiculoRouter.delete('/tipovehiculo', [authMiddleware, isAdmin], tipoVehiculoController.deleteTipoVehiculo);

module.exports = tipoVehiculoRouter; 