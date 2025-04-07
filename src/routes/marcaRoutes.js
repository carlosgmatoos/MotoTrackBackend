const express = require('express');
const marcaRouter = express.Router();
const marcaController = require('../controllers/marcaController');
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware');
const marcaValidationMiddleware = require('../middlewares/marcaValidationMiddleware');

marcaRouter.get('/marca', marcaController.getAllMarcas);
marcaRouter.post('/marca', [authMiddleware, isAdmin], marcaValidationMiddleware.validateMarcaCreation, marcaController.createMarca);
marcaRouter.put('/marca', [authMiddleware, isAdmin], marcaValidationMiddleware.validateMarcaUpdate, marcaController.updateMarca);
marcaRouter.delete('/marca', [authMiddleware, isAdmin], marcaController.deleteMarca);

module.exports = marcaRouter; 