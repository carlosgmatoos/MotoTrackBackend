const express = require('express');
const provinciaRouter = express.Router();
const provinciaController = require('../controllers/provinciaController');
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware');
const provinciaValidationMiddleware = require('../middlewares/provinciaValidationMiddleware');

provinciaRouter.get('/provincia', provinciaController.getAllProvincias);
provinciaRouter.post('/provincia', [authMiddleware, isAdmin], provinciaValidationMiddleware.validateProvinciaCreation, provinciaController.createProvincia);
provinciaRouter.put('/provincia', [authMiddleware, isAdmin], provinciaValidationMiddleware.validateProvinciaUpdate, provinciaController.updateProvincia);
provinciaRouter.delete('/provincia', [authMiddleware, isAdmin], provinciaController.deleteProvincia);

module.exports = provinciaRouter; 