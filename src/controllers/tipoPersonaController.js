const tipoPersonaService = require('../services/tipoPersonaService');
const { handleError } = require('../utils/errorHandler');

const getTiposPersona = async (req, res) => {
  try {
    const tipos = await tipoPersonaService.getAllTiposPersona();
    return res.status(200).json({
      success: true,
      data: tipos
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const createTipoPersona = async (req, res) => {
  try {
    const tipoData = req.body;
    const newTipo = await tipoPersonaService.createTipoPersona(tipoData);
    return res.status(201).json({
      success: true,
      message: 'Tipo de persona creado exitosamente',
      data: newTipo
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateTipoPersona = async (req, res) => {
  try {
    const id = req.body.idTipoPersona || req.body.id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del tipo de persona'
      });
    }
    
    const tipoData = req.body;
    const updatedTipo = await tipoPersonaService.updateTipoPersona(id, tipoData);
    return res.status(200).json({
      success: true,
      message: 'Tipo de persona actualizado exitosamente',
      data: updatedTipo
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteTipoPersona = async (req, res) => {
  try {
    const id = req.body.idTipoPersona || req.body.id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del tipo de persona'
      });
    }
    
    await tipoPersonaService.deleteTipoPersona(id);
    return res.status(200).json({
      success: true,
      message: 'Tipo de persona eliminado exitosamente'
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getTiposPersona,
  createTipoPersona,
  updateTipoPersona,
  deleteTipoPersona
}; 