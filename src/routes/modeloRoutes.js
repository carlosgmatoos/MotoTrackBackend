const express = require('express');
const modeloRouter = express.Router();
const modeloController = require('../controllers/modeloController');
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware');
const modeloValidationMiddleware = require('../middlewares/modeloValidationMiddleware');

modeloRouter.get('/modelo', modeloController.getAllModelos);
modeloRouter.post('/modelo', [authMiddleware, isAdmin], modeloValidationMiddleware.validateModeloCreation, modeloController.createModelo);
modeloRouter.put('/modelo', [authMiddleware, isAdmin], modeloValidationMiddleware.validateModeloUpdate, modeloController.updateModelo);
modeloRouter.delete('/modelo', [authMiddleware, isAdmin], modeloController.deleteModelo);

module.exports = modeloRouter; 