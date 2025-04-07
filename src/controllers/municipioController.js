const municipioService = require('../services/municipioService');
const { handleError } = require('../utils/errorHandler');

const getAllMunicipios = async (req, res) => {
  try {
    const { id, nombreMunicipio, estado, idProvincia } = req.query;
    
    // Build filters object
    const filters = {};
    if (id) filters.idMunicipio = parseInt(id, 10);
    if (nombreMunicipio) filters.nombreMunicipio = nombreMunicipio;
    if (estado) filters.estado = estado;
    if (idProvincia) filters.idProvincia = parseInt(idProvincia, 10);
    
    const municipios = await municipioService.getAllMunicipios(filters);
    
    // If ID was provided but no results found
    if (id && municipios.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Municipio no encontrado',
        message: `No se encontró el municipio con ID ${id}`
      });
    }
    
    // If ID was provided and found, return single object instead of array
    if (id && municipios.length > 0) {
      return res.status(200).json({
        success: true,
        data: municipios[0]
      });
    }
    
    res.status(200).json({
      success: true,
      count: municipios.length,
      data: municipios
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener municipios');
  }
};

const createMunicipio = async (req, res) => {
  try {
    const { nombreMunicipio, idProvincia } = req.body;
    
    // Validate data
    if (!nombreMunicipio || !idProvincia) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El nombre del municipio y la provincia son obligatorios'
      });
    }
    
    const newMunicipio = await municipioService.createMunicipio({
      nombreMunicipio,
      idProvincia
    });
    
    res.status(201).json({
      success: true,
      message: 'Municipio creado exitosamente',
      data: newMunicipio
    });
  } catch (error) {
    handleError(res, error, 'Error al crear municipio');
  }
};

const updateMunicipio = async (req, res) => {
  try {
    const municipioId = parseInt(req.body.idMunicipio || req.body.id);
    
    if (!municipioId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del municipio es obligatorio'
      });
    }
    
    const { nombreMunicipio, estado, idProvincia } = req.body;
    
    const updatedMunicipio = await municipioService.updateMunicipio(municipioId, {
      nombreMunicipio,
      estado,
      idProvincia
    });
    
    if (!updatedMunicipio) {
      return res.status(404).json({
        success: false,
        error: 'Municipio no encontrado',
        message: `No se encontró el municipio con ID ${municipioId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Municipio actualizado exitosamente',
      data: updatedMunicipio
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar municipio');
  }
};

const deleteMunicipio = async (req, res) => {
  try {
    const municipioId = parseInt(req.body.idMunicipio || req.body.id);
    
    if (!municipioId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del municipio es obligatorio'
      });
    }
    
    const result = await municipioService.deleteMunicipio(municipioId);
    
    if (!result.success) {
      if (result.message === 'Municipio en uso') {
        return res.status(400).json({
          success: false,
          error: 'Municipio en uso',
          message: 'No se puede eliminar este municipio porque hay ubicaciones asociadas a él'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Municipio no encontrado',
        message: `No se encontró el municipio con ID ${municipioId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Municipio eliminado exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar municipio');
  }
};

module.exports = {
  getAllMunicipios,
  createMunicipio,
  updateMunicipio,
  deleteMunicipio
}; 