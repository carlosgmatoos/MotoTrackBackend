const express = require('express');
const seguroRouter = express.Router();
const seguroController = require('../controllers/seguroController');
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware');
const seguroValidationMiddleware = require('../middlewares/seguroValidationMiddleware');

seguroRouter.get('/seguro', seguroController.getAllSeguros);
seguroRouter.post('/seguro', [authMiddleware, isAdmin], seguroValidationMiddleware.validateSeguroCreation, seguroController.createSeguro);
seguroRouter.put('/seguro', [authMiddleware, isAdmin], seguroValidationMiddleware.validateSeguroUpdate, seguroController.updateSeguro);
seguroRouter.delete('/seguro', [authMiddleware, isAdmin], seguroController.deleteSeguro);

module.exports = seguroRouter; 