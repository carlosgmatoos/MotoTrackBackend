const provinciaService = require('../services/provinciaService');
const { handleError } = require('../utils/errorHandler');

const getAllProvincias = async (req, res) => {
  try {
    const { id, nombreProvincia, estado } = req.query;
    
    // Build filters object
    const filters = {};
    if (id) filters.idProvincia = parseInt(id, 10);
    if (nombreProvincia) filters.nombreProvincia = nombreProvincia;
    if (estado) filters.estado = estado;
    
    const provincias = await provinciaService.getAllProvincias(filters);
    
    if (id && provincias.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Provincia no encontrada',
        message: `No se encontró la provincia con ID ${id}`
      });
    }
    
    if (id && provincias.length > 0) {
      return res.status(200).json({
        success: true,
        data: provincias[0]
      });
    }
    
    res.status(200).json({
      success: true,
      count: provincias.length,
      data: provincias
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener provincias');
  }
};

const createProvincia = async (req, res) => {
  try {
    const { nombreProvincia } = req.body;
    
    // Validate data
    if (!nombreProvincia) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El nombre de la provincia es obligatorio'
      });
    }
    
    const newProvincia = await provinciaService.createProvincia({
      nombreProvincia
    });
    
    res.status(201).json({
      success: true,
      message: 'Provincia creada exitosamente',
      data: newProvincia
    });
  } catch (error) {
    handleError(res, error, 'Error al crear provincia');
  }
};

const updateProvincia = async (req, res) => {
  try {
    const provinciaId = parseInt(req.body.idProvincia || req.body.id);
    
    if (!provinciaId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la provincia es obligatorio'
      });
    }
    
    const { nombreProvincia, estado } = req.body;
    
    const updatedProvincia = await provinciaService.updateProvincia(provinciaId, {
      nombreProvincia,
      estado
    });
    
    if (!updatedProvincia) {
      return res.status(404).json({
        success: false,
        error: 'Provincia no encontrada',
        message: `No se encontró la provincia con ID ${provinciaId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Provincia actualizada exitosamente',
      data: updatedProvincia
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar provincia');
  }
};

const deleteProvincia = async (req, res) => {
  try {
    const provinciaId = parseInt(req.body.idProvincia || req.body.id);
    
    if (!provinciaId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la provincia es obligatorio'
      });
    }
    
    const result = await provinciaService.deleteProvincia(provinciaId);
    
    if (!result.success) {
      if (result.message === 'Provincia en uso') {
        return res.status(400).json({
          success: false,
          error: 'Provincia en uso',
          message: 'No se puede eliminar esta provincia porque hay municipios asociados a ella'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Provincia no encontrada',
        message: `No se encontró la provincia con ID ${provinciaId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Provincia eliminada exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar provincia');
  }
};

module.exports = {
  getAllProvincias,
  createProvincia,
  updateProvincia,
  deleteProvincia
}; 