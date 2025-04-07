const express = require('express');
const municipioRouter = express.Router();
const municipioController = require('../controllers/municipioController');
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware');
const municipioValidationMiddleware = require('../middlewares/municipioValidationMiddleware');

municipioRouter.get('/municipio', municipioController.getAllMunicipios);
municipioRouter.post('/municipio', [authMiddleware, isAdmin], municipioValidationMiddleware.validateMunicipioCreation, municipioController.createMunicipio);
municipioRouter.put('/municipio', [authMiddleware, isAdmin], municipioValidationMiddleware.validateMunicipioUpdate, municipioController.updateMunicipio);
municipioRouter.delete('/municipio', [authMiddleware, isAdmin], municipioController.deleteMunicipio);

module.exports = municipioRouter; 