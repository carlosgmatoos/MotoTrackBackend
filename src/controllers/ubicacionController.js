const ubicacionService = require('../services/ubicacionService');
const { handleError } = require('../utils/errorHandler');

const getAllUbicaciones = async (req, res) => {
  try {
    const { id, direccion, estado, idMunicipio } = req.query;
    
    // Build filters object
    const filters = {};
    if (id) filters.idUbicacion = parseInt(id, 10);
    if (direccion) filters.direccion = direccion;
    if (estado) filters.estado = estado;
    if (idMunicipio) filters.idMunicipio = parseInt(idMunicipio, 10);
    
    const ubicaciones = await ubicacionService.getAllUbicaciones(filters);
    
    // If ID was provided but no results found
    if (id && ubicaciones.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ubicación no encontrada',
        message: `No se encontró la ubicación con ID ${id}`
      });
    }
    
    // If ID was provided and found, return single object instead of array
    if (id && ubicaciones.length > 0) {
      return res.status(200).json({
        success: true,
        data: ubicaciones[0]
      });
    }
    
    res.status(200).json({
      success: true,
      count: ubicaciones.length,
      data: ubicaciones
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener ubicaciones');
  }
};

const createUbicacion = async (req, res) => {
  try {
    const { direccion, idMunicipio } = req.body;
    
    // Validate data
    if (!direccion || !idMunicipio) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'La dirección y el municipio son obligatorios'
      });
    }
    
    const newUbicacion = await ubicacionService.createUbicacion({
      direccion,
      idMunicipio
    });
    
    res.status(201).json({
      success: true,
      message: 'Ubicación creada exitosamente',
      data: newUbicacion
    });
  } catch (error) {
    handleError(res, error, 'Error al crear ubicación');
  }
};

const updateUbicacion = async (req, res) => {
  try {
    const ubicacionId = parseInt(req.body.idUbicacion || req.body.id);
    
    if (!ubicacionId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la ubicación es obligatorio'
      });
    }
    
    const { direccion, estado, idMunicipio } = req.body;
    
    const updatedUbicacion = await ubicacionService.updateUbicacion(ubicacionId, {
      direccion,
      estado,
      idMunicipio
    });
    
    if (!updatedUbicacion) {
      return res.status(404).json({
        success: false,
        error: 'Ubicación no encontrada',
        message: `No se encontró la ubicación con ID ${ubicacionId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Ubicación actualizada exitosamente',
      data: updatedUbicacion
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar ubicación');
  }
};

const deleteUbicacion = async (req, res) => {
  try {
    const ubicacionId = parseInt(req.body.idUbicacion || req.body.id);
    
    if (!ubicacionId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la ubicación es obligatorio'
      });
    }
    
    const result = await ubicacionService.deleteUbicacion(ubicacionId);
    
    if (!result.success) {
      if (result.message === 'Ubicación en uso') {
        return res.status(400).json({
          success: false,
          error: 'Ubicación en uso',
          message: 'No se puede eliminar esta ubicación porque hay personas asociadas a ella'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Ubicación no encontrada',
        message: `No se encontró la ubicación con ID ${ubicacionId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Ubicación eliminada exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar ubicación');
  }
};

module.exports = {
  getAllUbicaciones,
  createUbicacion,
  updateUbicacion,
  deleteUbicacion
}; 